import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/app/action-plan")({
  validateSearch: (s) => search.parse(s),
  component: () => {
    const { shop } = Route.useSearch();
    return <Navigate to="/app" search={{ shop } as never} replace />;
  },
});
