import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

// Must be a class component — React error boundaries cannot be hooks.
// Isolated here so the tsconfig class-fields quirk only affects this file.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = { error: null } as State;
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const self = this as any;
    const error: Error | null = self.state?.error ?? null;
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Terjadi kesalahan aplikasi</h2>
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-3 rounded">{error.message}</p>
            <button
              onClick={() => self.setState({ error: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }
    return (self.props as Props).children;
  }
}
