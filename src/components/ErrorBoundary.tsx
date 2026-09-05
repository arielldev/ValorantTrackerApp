import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Display, Body, Logo } from "./ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ValoStore crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-obsidian px-8 text-center safe-top safe-bottom">
        <Logo size={72} className="opacity-80" />
        <div className="flex flex-col gap-2">
          <Display as="h1" size="d2">
            Something broke
          </Display>
          <Body tone="ash" small>
            {this.state.error.message}
          </Body>
        </div>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}
