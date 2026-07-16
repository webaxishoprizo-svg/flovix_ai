import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s) => search.parse(s),
  component: () => {
    const { shop } = Route.useSearch();
    if (shop) return <Navigate to="/app" search={{ shop } as never} replace />;
    return <Navigate to="/auth" replace />;
  },
});
