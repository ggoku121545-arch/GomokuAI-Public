namespace Gomoku.Web.Presentation;

public sealed class AlkagiGameResult
{
    public string Mode { get; set; } = "alkagi";
    public int Winner { get; set; }
    public string WinnerName { get; set; } = string.Empty;
    public int Player1Remaining { get; set; }
    public int Player2Remaining { get; set; }
    public int TurnsPlayed { get; set; }
    public DateTimeOffset FinishedAtUtc { get; set; }
}
