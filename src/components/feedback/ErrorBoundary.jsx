import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Falha ao renderizar uma página:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="site-container site-section" role="alert">
          <h1>Não foi possível exibir esta página</h1>
          <p>Recarregue a página. Se o problema continuar, consulte o console do navegador.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
