import React from 'react';
import PricePredictor from './PricePredictor';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary ERROR_MSG:", error?.name, "---", error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', maxWidth: '800px', margin: '40px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', color: '#0f172a', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>⚠️ Something went wrong in the component tree</h2>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', overflow: 'auto', border: '1px solid #e2e8f0', fontSize: '13px' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '20px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <div>
        <PricePredictor />
      </div>
    </ErrorBoundary>
  );
}

export default App;