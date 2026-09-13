const request = require("supertest");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { ChatRepository } = require("../src/modules/chat/chat.repository");
const { ChatService } = require("../src/modules/chat/chat.service");
const { signAccessToken } = require("../src/modules/auth/jwt.service");
const socketServer = require("../src/socket");
const { registerChatHandlers } = require("../src/socket/chatHandler");
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const id = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";
describe("Nest chat HTTP and injected Socket.IO service", () => {
  let app, repo, actor, io, socket, handlers;
  beforeAll(async () => { app = await createApp(); repo = app.locals.nest.get(ChatRepository); });
  afterAll(async () => { await app.locals.nest.close(); });
  beforeEach(() => {
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    for (const [method, result] of Object.entries({ findMembership: { id, user_id: userId }, listMessages: { rows: [{ id, content: "Hello" }], total: 1 }, createMessage: { id, content: "Hello" }, markRead: 2, unreadCounts: [{ connection_id: id, unread_count: 2 }] })) jest.spyOn(repo, method).mockResolvedValue(result);
    io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    jest.spyOn(socketServer, "getIO").mockReturnValue(io);
    handlers = {};
    socket = { user: actor, on: (event, handler) => { handlers[event] = handler; }, join: jest.fn(), to: io.to };
    registerChatHandlers(socket, app.locals.nest.get(ChatService));
  });
  afterEach(() => jest.restoreAllMocks());
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("HTTP messages, read receipts and unread counts keep response and broadcasts", async () => {
    await request(app).get(`/api/chat/${id}/messages?page=2&limit=10`).set("Authorization", auth(actor)).expect(200);
    expect(repo.findMembership).toHaveBeenCalledWith(id, userId);
    expect(repo.listMessages).toHaveBeenCalledWith(id, { page: 2, limit: 10 });
    const message = await request(app).post(`/api/chat/${id}/messages`).set("Authorization", auth(actor)).send({ content: " Hello ", senderId: id }).expect(201);
    expect(message.body).toEqual({ success: true, data: { message: { id, content: "Hello" } }, message: "Message sent" });
    expect(repo.createMessage).toHaveBeenCalledWith(id, userId, { content: "Hello", messageType: "text" });
    expect(io.to).toHaveBeenCalledWith(`chat:${id}`); expect(io.emit).toHaveBeenCalledWith("chat:receive", { id, content: "Hello" });
    const read = await request(app).patch(`/api/chat/${id}/read`).set("Authorization", auth(actor)).expect(200);
    expect(read.body.data).toEqual({ updated: 2 });
    expect(io.emit).toHaveBeenCalledWith("chat:read", { connectionId: id, userId, updated: 2 });
    const unread = await request(app).get("/api/chat/unread").set("Authorization", auth(actor)).expect(200);
    expect(unread.body.data.items).toEqual([{ connection_id: id, unread_count: 2 }]);
  });
  test("non-member cannot read, send or mark another conversation read", async () => {
    repo.findMembership.mockResolvedValue(null);
    for (const [method, path] of [["get", "messages"], ["post", "messages"], ["patch", "read"]]) await request(app)[method](`/api/chat/${id}/${path}`).set("Authorization", auth(actor)).send(method === "post" ? { content: "Hello" } : undefined).expect(403);
    expect(repo.listMessages).not.toHaveBeenCalled(); expect(repo.createMessage).not.toHaveBeenCalled(); expect(repo.markRead).not.toHaveBeenCalled(); expect(io.emit).not.toHaveBeenCalled();
  });
  test("HTTP role/account and validation guards", async () => {
    await request(app).get("/api/chat/unread").expect(401);
    actor.role = "admin";
    await request(app).get("/api/chat/unread").set("Authorization", auth(actor)).expect(403);
    actor.role = "trainer"; actor.status = "locked";
    await request(app).get("/api/chat/unread").set("Authorization", auth(actor)).expect(403);
    actor.status = "active"; actor.email_verified_at = null;
    await request(app).get("/api/chat/unread").set("Authorization", auth(actor)).expect(403);
    actor.email_verified_at = "2026-01-01";
    await request(app).post(`/api/chat/${id}/messages`).set("Authorization", auth(actor)).send({ content: " " }).expect(400);
    await request(app).get(`/api/chat/${id}/messages?limit=101`).set("Authorization", auth(actor)).expect(400);
    await request(app).patch("/api/chat/bad/read").set("Authorization", auth(actor)).expect(400);
  });
  test("socket join, send and read resolve the same Nest service/repository", async () => {
    const ack = jest.fn();
    await handlers["chat:join"]({ connectionId: id }, ack);
    expect(socket.join).toHaveBeenCalledWith(`chat:${id}`);
    await handlers["chat:send"]({ connectionId: id, content: " Hello " }, ack);
    expect(repo.createMessage).toHaveBeenCalledWith(id, userId, { content: "Hello", messageType: "text" });
    expect(ack).toHaveBeenLastCalledWith({ ok: true, data: { message: { id, content: "Hello" } } });
    await handlers["chat:read"]({ connectionId: id }, ack);
    expect(ack).toHaveBeenLastCalledWith({ ok: true, data: { updated: 2 } });
  });
  test.each(["chat:join", "chat:send", "chat:typing", "chat:read"])("socket %s rejects non-members and malformed IDs", async (event) => {
    const ack = jest.fn();
    await handlers[event]({ connectionId: "bad", content: "Hello", typing: true }, ack);
    expect(ack).toHaveBeenLastCalledWith({ ok: false, error: "Invalid chat event payload" });
    repo.findMembership.mockResolvedValue(null);
    await handlers[event]({ connectionId: id, content: "Hello", typing: true }, ack);
    expect(ack).toHaveBeenLastCalledWith({ ok: false, error: "Active trainer connection required" });
    expect(socket.join).not.toHaveBeenCalled(); expect(io.emit).not.toHaveBeenCalled();
  });
  test("socket rate limiter still rejects the 31st send", async () => {
    const ack = jest.fn();
    for (let index = 0; index < 31; index++) await handlers["chat:send"]({ connectionId: id, content: "Hello" }, ack);
    expect(repo.createMessage).toHaveBeenCalledTimes(30);
    expect(ack).toHaveBeenLastCalledWith({ ok: false, error: "Too many chat events. Try again later." });
  });
});
