namespace Gomoku.Web.Theming;

public sealed record BoardTheme(string Id, string Name, string Description);

public static class BoardThemes
{
    public static BoardTheme LinedPaper { get; } = new(
        "lined-paper",
        "줄공책",
        "푸른 줄과 붉은 여백선이 있는 줄공책");

    public static BoardTheme HandDrawn { get; } = new(
        "hand-drawn",
        "손그림 공책",
        "민짜 공책에 연필로 직접 그린 듯한 판");

    public static BoardTheme Monochrome { get; } = new(
        "monochrome",
        "흑백",
        "흰 배경과 또렷한 검은 선으로 만든 판");

    public static BoardTheme Chalkboard { get; } = new(
        "chalkboard",
        "학교 칠판",
        "나무 테두리와 분필 선이 있는 초록 칠판");

    public static IReadOnlyList<BoardTheme> All { get; } =
        [LinedPaper, HandDrawn, Monochrome, Chalkboard];

    public static BoardTheme Default => LinedPaper;
}
