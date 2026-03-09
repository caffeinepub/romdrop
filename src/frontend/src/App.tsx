import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Footer from "./components/Footer";
import Header from "./components/Header";
import SharePage from "./pages/SharePage";
import UploadPage from "./pages/UploadPage";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.10 0.015 240)",
            border: "1px solid oklch(0.22 0.04 220)",
            color: "oklch(0.92 0.02 200)",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "13px",
          },
        }}
      />
    </div>
  ),
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: UploadPage,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share/$id",
  component: SharePage,
});

const routeTree = rootRoute.addChildren([uploadRoute, shareRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
