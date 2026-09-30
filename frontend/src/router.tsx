import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { RecipeDetailScreen } from "@/components/RecipeDetailScreen";
import { RecipeFormScreen } from "@/components/RecipeFormScreen";
import { RecipeListScreen } from "@/components/RecipeListScreen";

// Route components own navigation; screens only receive callbacks,
// which keeps them testable without a router.

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: function ListPage() {
    const navigate = useNavigate();
    return (
      <RecipeListScreen
        onOpenRecipe={(id) => navigate({ to: "/recipes/$recipeId", params: { recipeId: id } })}
        onAdd={() => navigate({ to: "/recipes/new" })}
      />
    );
  },
});

const newRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/new",
  component: function NewRecipePage() {
    const navigate = useNavigate();
    return (
      <RecipeFormScreen
        onSaved={(id) => navigate({ to: "/recipes/$recipeId", params: { recipeId: id } })}
        onCancel={() => navigate({ to: "/" })}
      />
    );
  },
});

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/$recipeId",
  component: function RecipeDetailPage() {
    const { recipeId } = detailRoute.useParams();
    const navigate = useNavigate();
    return (
      <RecipeDetailScreen
        recipeId={recipeId}
        onBack={() => navigate({ to: "/" })}
        onEdit={() => navigate({ to: "/recipes/$recipeId/edit", params: { recipeId } })}
        onDeleted={() => navigate({ to: "/" })}
      />
    );
  },
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/$recipeId/edit",
  component: function EditRecipePage() {
    const { recipeId } = editRoute.useParams();
    const navigate = useNavigate();
    return (
      <RecipeFormScreen
        recipeId={recipeId}
        onSaved={(id) => navigate({ to: "/recipes/$recipeId", params: { recipeId: id } })}
        onCancel={() => navigate({ to: "/recipes/$recipeId", params: { recipeId } })}
      />
    );
  },
});

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5 text-center text-ink">
      <div>
        <p className="text-[18px] font-bold">페이지를 찾을 수 없어요</p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-cream"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}

const routeTree = rootRoute.addChildren([listRoute, newRoute, detailRoute, editRoute]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
