using Gomoku.Core;
using Xunit;

namespace Gomoku.Core.Tests;

public class GameTests
{
    [Theory]
    [InlineData(3, 2, 0, 1)]
    [InlineData(2, 3, 1, 0)]
    [InlineData(2, 2, 1, 1)]
    [InlineData(2, 6, 1, -1)]
    public void DetectsWinInEveryDirection(int row, int column, int rowStep, int columnStep)
    {
        var game = new Game();
        for (var i = 0; i < 5; i++)
        {
            Assert.True(game.TryPlay(new(row + i * rowStep, column + i * columnStep)));
            if (i < 4) Assert.True(game.TryPlay(new(14, i)));
        }
        Assert.Equal(GameResult.BlackWins, game.Result);
        Assert.Equal(5, game.WinningLine.Count);
    }

    [Fact]
    public void RejectsOccupiedPosition()
    {
        var game = new Game();
        Assert.True(game.TryPlay(new(7, 7)));
        Assert.False(game.TryPlay(new(7, 7)));
        Assert.Single(game.Moves);
    }

    [Fact]
    public void AiReturnsLegalMoveAndBlocksImmediateWin()
    {
        var game = new Game();
        for (var i = 0; i < 4; i++)
        {
            game.TryPlay(new(7, 3 + i));
            if (i < 3) game.TryPlay(new(0, i));
        }
        var move = new GomokuAi().ChooseMove(game);
        Assert.NotNull(move);
        Assert.Equal(Stone.Empty, game[move!.Value.Row, move.Value.Column]);
        Assert.True(move == new Position(7, 2) || move == new Position(7, 7));
    }

    [Fact]
    public void PlayerStatsTracksResultsWinRateAndStreaks()
    {
        var stats = new PlayerStats();

        stats.RecordMatch(MatchOutcome.Win, 17, "lined-paper");
        stats.RecordMatch(MatchOutcome.Win, 21, "chalkboard");
        stats.RecordMatch(MatchOutcome.Loss, 18, "monochrome");
        stats.RecordMatch(MatchOutcome.Draw, 225, "hand-drawn");

        Assert.Equal(2, stats.Wins);
        Assert.Equal(1, stats.Losses);
        Assert.Equal(1, stats.Draws);
        Assert.Equal(4, stats.TotalGames);
        Assert.Equal(50, stats.WinRatePercent);
        Assert.Equal(0, stats.CurrentWinStreak);
        Assert.Equal(2, stats.BestWinStreak);
        Assert.Equal(MatchOutcome.Draw, stats.Matches[0].Outcome);
    }

    [Fact]
    public void PlayerStatsKeepsOnlyTheMostRecentHundredMatches()
    {
        var stats = new PlayerStats();

        for (var index = 0; index < PlayerStats.MaxStoredMatches + 5; index++)
            stats.RecordMatch(MatchOutcome.Win, index, "lined-paper");

        Assert.Equal(PlayerStats.MaxStoredMatches + 5, stats.Wins);
        Assert.Equal(PlayerStats.MaxStoredMatches, stats.Matches.Count);
        Assert.Equal(PlayerStats.MaxStoredMatches + 4, stats.Matches[0].MoveCount);
    }
}
