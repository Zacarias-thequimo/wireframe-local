import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

function App() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Home />
    </ErrorBoundary>
  );
}

export default App;
