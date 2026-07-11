import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("[Render Error]", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="panel max-w-md border-red-200 bg-red-50 text-red-800">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-red-700">Please reload the page and try again.</p>
          {import.meta.env.DEV && <pre className="mt-4 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{error.stack || error.message}</pre>}
          <button className="btn-primary mt-4" type="button" onClick={this.handleReload}>
            Reload page
          </button>
        </section>
      </main>
    );
  }
}
