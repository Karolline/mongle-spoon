import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/services/errors";
import {
  MOCK_PASSWORD,
  resetMockRecipes,
  mockRecipeService,
} from "@/services/mockRecipeService";
import { RecipeListScreen } from "./RecipeListScreen";
import { RecipeDetailScreen } from "./RecipeDetailScreen";
import { RecipeFormScreen } from "./RecipeFormScreen";

// Most tests start unlocked; "write protection" below covers the locked state.
beforeEach(async () => {
  resetMockRecipes();
  await mockRecipeService.unlock(MOCK_PASSWORD);
});

describe("RecipeListScreen", () => {
  it("shows seeded recipes sorted by most recently updated", async () => {
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("소고기 애호박 미음");
  });

  it("searches by ingredient name", async () => {
    const user = userEvent.setup();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    await user.type(screen.getByLabelText("이름 또는 재료 검색"), "브로콜리");
    await waitFor(() =>
      expect(screen.getByText("닭안심 브로콜리 죽")).toBeInTheDocument(),
    );
    expect(screen.queryByText("소고기 애호박 미음")).not.toBeInTheDocument();
  });

  it("filters by meal time", async () => {
    const user = userEvent.setup();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    await user.click(screen.getByRole("button", { name: "간식" }));
    await waitFor(() =>
      expect(screen.queryByText("닭안심 브로콜리 죽")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("단호박 고구마 매시")).toBeInTheDocument();
  });

  it("clears the meal-time filter when the active chip is tapped again", async () => {
    const user = userEvent.setup();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    const snack = screen.getByRole("button", { name: "간식" });
    await user.click(snack);
    await waitFor(() =>
      expect(screen.queryByText("닭안심 브로콜리 죽")).not.toBeInTheDocument(),
    );
    await user.click(snack);
    await screen.findByText("닭안심 브로콜리 죽");
    expect(snack).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("recipe-count")).toHaveTextContent("5개");
  });

  it("shows a friendly message when search has no results", async () => {
    const user = userEvent.setup();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    await user.type(screen.getByLabelText("이름 또는 재료 검색"), "없는재료");
    await screen.findByText("찾는 레시피가 없어요");
  });

  it("shows the empty state when there are no recipes at all", async () => {
    const all = await mockRecipeService.listRecipes();
    await Promise.all(all.map((r) => mockRecipeService.deleteRecipe(r.id)));
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("아직 저장된 레시피가 없어요");
  });

  it("counts the filtered results, not every recipe", async () => {
    const user = userEvent.setup();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    expect(screen.getByTestId("recipe-count")).toHaveTextContent("5개");
    await user.click(screen.getByRole("button", { name: "간식" }));
    await waitFor(() =>
      expect(screen.getByTestId("recipe-count")).toHaveTextContent("3개"),
    );
    await user.type(screen.getByLabelText("이름 또는 재료 검색"), "단호박");
    await waitFor(() =>
      expect(screen.getByTestId("recipe-count")).toHaveTextContent("1개"),
    );
  });

  it("shows the app version at the bottom", async () => {
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await screen.findByText("소고기 애호박 미음");
    const version = screen.getByTestId("app-version");
    expect(version).toHaveTextContent(`v${__APP_VERSION__}`);
    expect(version.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("opens a recipe and triggers add", async () => {
    const user = userEvent.setup();
    const onOpenRecipe = vi.fn();
    const onAdd = vi.fn();
    render(<RecipeListScreen onOpenRecipe={onOpenRecipe} onAdd={onAdd} />);
    await user.click(await screen.findByText("소고기 애호박 미음"));
    expect(onOpenRecipe).toHaveBeenCalledWith("seed-1");
    await user.click(screen.getByRole("button", { name: /추가/ }));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe("RecipeListScreen loading", () => {
  // Kept stable: a new array on every render would restart loading.
  const NO_WAIT = [0, 0, 0];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading message instead of zero recipes", async () => {
    vi.spyOn(mockRecipeService, "listRecipes").mockReturnValue(
      new Promise(() => {}),
    );
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    expect(
      await screen.findByText("레시피를 불러오는 중이에요…"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("recipe-count")).not.toBeInTheDocument();
    expect(
      screen.queryByText("아직 저장된 레시피가 없어요"),
    ).not.toBeInTheDocument();
  });

  it("retries automatically until the server answers", async () => {
    const real = mockRecipeService.listRecipes.bind(mockRecipeService);
    const spy = vi
      .spyOn(mockRecipeService, "listRecipes")
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(real);
    render(
      <RecipeListScreen
        onOpenRecipe={vi.fn()}
        onAdd={vi.fn()}
        retryDelaysMs={NO_WAIT}
      />,
    );
    await screen.findByText("소고기 애호박 미음");
    expect(spy).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers a retry button after every automatic retry fails", async () => {
    const user = userEvent.setup();
    const real = mockRecipeService.listRecipes.bind(mockRecipeService);
    const spy = vi
      .spyOn(mockRecipeService, "listRecipes")
      .mockRejectedValue(new Error("offline"));
    render(
      <RecipeListScreen
        onOpenRecipe={vi.fn()}
        onAdd={vi.fn()}
        retryDelaysMs={NO_WAIT}
      />,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("서버에 연결 중이에요");
    expect(spy).toHaveBeenCalledTimes(4);
    expect(screen.queryByTestId("recipe-count")).not.toBeInTheDocument();

    spy.mockImplementation(real);
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    await screen.findByText("소고기 애호박 미음");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("recipe-count")).toHaveTextContent("5개");
  });
});

describe("RecipeFormScreen", () => {
  it("requires a name and shows an inline Korean error", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<RecipeFormScreen onSaved={onSaved} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "메뉴 이름을 입력해 주세요.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("creates a recipe with ingredient rows and meal times", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<RecipeFormScreen onSaved={onSaved} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("메뉴 이름"), "감자 미음");
    await user.type(screen.getByLabelText("재료 이름 1"), "감자");
    await user.type(screen.getByLabelText("재료 양 1"), "1/2개");
    await user.click(screen.getByRole("button", { name: "+ 재료 추가" }));
    await user.type(screen.getByLabelText("재료 이름 2"), "물");
    await user.type(screen.getByLabelText("재료 양 2"), "100ml");
    await user.click(screen.getByLabelText("재료 삭제 2"));
    expect(screen.queryByLabelText("재료 이름 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "아침" }));
    await user.type(screen.getByLabelText("분량"), "2회분");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const created = await mockRecipeService.getRecipe(onSaved.mock.calls[0]![0]);
    expect(created?.name).toBe("감자 미음");
    expect(created?.ingredients).toEqual([{ name: "감자", amount: "1/2개" }]);
    expect(created?.mealTimes).toEqual(["breakfast"]);
    expect(created?.servings).toBe("2회분");
  });

  it("edits an existing recipe", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <RecipeFormScreen recipeId="seed-2" onSaved={onSaved} onCancel={vi.fn()} />,
    );
    const nameInput = await screen.findByLabelText("메뉴 이름");
    expect(nameInput).toHaveValue("단호박 고구마 매시");
    await user.clear(nameInput);
    await user.type(nameInput, "단호박 매시");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("seed-2"));
    expect((await mockRecipeService.getRecipe("seed-2"))?.name).toBe(
      "단호박 매시",
    );
  });
});

describe("RecipeDetailScreen", () => {
  it("shows every filled field and hides empty ones", async () => {
    render(
      <RecipeDetailScreen
        recipeId="seed-1"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "소고기 애호박 미음" });
    expect(screen.getByText("재료")).toBeInTheDocument();
    expect(screen.getByText("만드는 법")).toBeInTheDocument();
    expect(screen.getByText("메모")).toBeInTheDocument();
    expect(screen.getByText("3~4회분")).toBeInTheDocument();
  });

  it("hides sections with no content", async () => {
    render(
      <RecipeDetailScreen
        recipeId="seed-2"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "단호박 고구마 매시" });
    expect(screen.queryByText("메모")).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(
      <RecipeDetailScreen
        recipeId="seed-1"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={onDeleted}
      />,
    );
    await screen.findByRole("heading", { name: "소고기 애호박 미음" });
    await user.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = screen.getByRole("dialog", { name: "삭제 확인" });
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(await mockRecipeService.getRecipe("seed-1")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "삭제 확인" })).getByRole(
        "button",
        { name: "삭제하기" },
      ),
    );
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(await mockRecipeService.getRecipe("seed-1")).toBeNull();
  });

  it("triggers edit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <RecipeDetailScreen
        recipeId="seed-1"
        onBack={vi.fn()}
        onEdit={onEdit}
        onDeleted={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "소고기 애호박 미음" });
    await user.click(screen.getByRole("button", { name: "수정" }));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe("write protection", () => {
  beforeEach(() => {
    mockRecipeService.lock();
  });

  async function enterPassword(
    user: ReturnType<typeof userEvent.setup>,
    password: string,
  ) {
    const dialog = await screen.findByRole("dialog", { name: "비밀번호 입력" });
    const input = within(dialog).getByLabelText("비밀번호");
    await user.clear(input);
    await user.type(input, password);
    await user.click(within(dialog).getByRole("button", { name: "확인" }));
  }

  it("asks for the password before adding, then remembers it", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={onAdd} />);
    await screen.findByText("소고기 애호박 미음");
    expect(screen.queryByRole("button", { name: "잠금" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /추가/ }));
    await enterPassword(user, "wrong");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "비밀번호가 맞지 않아요.",
    );
    expect(onAdd).not.toHaveBeenCalled();

    await enterPassword(user, MOCK_PASSWORD);
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("dialog", { name: "비밀번호 입력" }),
    ).not.toBeInTheDocument();

    // Remembered: the next add goes straight through.
    await user.click(screen.getByRole("button", { name: /추가/ }));
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("locks again with the lock button", async () => {
    const user = userEvent.setup();
    await mockRecipeService.unlock(MOCK_PASSWORD);
    render(<RecipeListScreen onOpenRecipe={vi.fn()} onAdd={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "잠금" }));
    expect(mockRecipeService.isUnlocked()).toBe(false);
    expect(screen.queryByRole("button", { name: "잠금" })).not.toBeInTheDocument();
  });

  it("cancelling the password dialog does nothing", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <RecipeDetailScreen
        recipeId="seed-1"
        onBack={vi.fn()}
        onEdit={onEdit}
        onDeleted={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "소고기 애호박 미음" });
    await user.click(screen.getByRole("button", { name: "수정" }));
    const dialog = screen.getByRole("dialog", { name: "비밀번호 입력" });
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(dialog).not.toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("asks for the password before the delete confirmation", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(
      <RecipeDetailScreen
        recipeId="seed-1"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={onDeleted}
      />,
    );
    await screen.findByRole("heading", { name: "소고기 애호박 미음" });
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.queryByRole("dialog", { name: "삭제 확인" })).not.toBeInTheDocument();

    await enterPassword(user, MOCK_PASSWORD);
    await user.click(
      within(await screen.findByRole("dialog", { name: "삭제 확인" })).getByRole(
        "button",
        { name: "삭제하기" },
      ),
    );
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(await mockRecipeService.getRecipe("seed-1")).toBeNull();
  });

  it("asks for the password when saving the form, then saves", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<RecipeFormScreen onSaved={onSaved} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText("메뉴 이름"), "감자 미음");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(onSaved).not.toHaveBeenCalled();

    await enterPassword(user, MOCK_PASSWORD);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const created = await mockRecipeService.getRecipe(onSaved.mock.calls[0]![0]);
    expect(created?.name).toBe("감자 미음");
  });

  it("asks again when the remembered password is rejected", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    // A password is remembered, but the server rejects it (e.g. it changed):
    // the service forgets it and throws a 401.
    await mockRecipeService.unlock(MOCK_PASSWORD);
    const create = vi
      .spyOn(mockRecipeService, "createRecipe")
      .mockImplementationOnce(async () => {
        mockRecipeService.lock();
        throw new ApiError(401, "Wrong or missing password");
      });
    render(<RecipeFormScreen onSaved={onSaved} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText("메뉴 이름"), "감자 미음");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await enterPassword(user, MOCK_PASSWORD);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(create).toHaveBeenCalledTimes(2);
    create.mockRestore();
  });
});
