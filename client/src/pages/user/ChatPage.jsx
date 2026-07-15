// Trang chat hien thi va xu ly luong nguoi dung.
import { useParams } from "react-router-dom";
import ChatWindow from "../../components/ChatWindow";
import PageHeader from "../../components/PageHeader";

export default function ChatPage() {
  const { connectionId } = useParams();
  return (
    <>
      <PageHeader title="Trainer Chat" />
      <ChatWindow connectionId={connectionId} />
    </>
  );
}
