import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/app/notifications")({
  validateSearch: (s) => search.parse(s),
  component: () => {
    const { shop } = Route.useSearch();
    return <Navigate to="/app/settings" search={{ shop } as never} replace />;
  },
});
