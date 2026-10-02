using Gomoku.Core;
using Xunit;

namespace Gomoku.Core.Tests;

public class OthelloGameTests
{
    [Fact]
    public void StartsWithStandardFourDiscsAndBlackToMove()
    {
        var game = new OthelloGame();

        Assert.Equal(OthelloDisc.Black, game.CurrentPlayer);
        Assert.Equal(2, game.BlackCount);
        Assert.Equal(2, game.WhiteCount);
        Assert.Equal(OthelloDisc.Black, game[3, 3]);
        Assert.Equal(OthelloDisc.White, game[3, 4]);
        Assert.Equal(OthelloDisc.White, game[4, 3]);
        Assert.Equal(OthelloDisc.Black, game[4, 4]);
        Assert.Equal(4, game.GetLegalMoves(OthelloDisc.Black).Count);
    }

    [Fact]
    public void CapturesAllEightDirectionsWithOneMove()
    {
        var board = EmptyBoard();
        var center = new OthelloPosition(3, 3);
        var directions = new (int Row, int Column)[]
        [
            (-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)
        ];
        foreach (var (dr, dc) in directions)
        {
            board[center.Row + dr, center.Column + dc] = OthelloDisc.White;
            board[center.Row + dr * 2, center.Column + dc * 2] = OthelloDisc.Black;
        }
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.True(game.TryPlay(center));
        Assert.Equal(8, game.LastFlippedStones.Count);
        Assert.All(game.LastFlippedStones, pos => Assert.Equal(OthelloDisc.Black, game[pos]));
    }

    [Fact]
    public void RejectsNonCapturingAndOccupiedMoves()
    {
        var game = new OthelloGame();

        Assert.False(game.TryPlay(new OthelloPosition(0, 0)));
        Assert.False(game.TryPlay(new OthelloPosition(3, 3)));
        Assert.Equal(0, game.MoveCount);
        Assert.Equal(OthelloDisc.Black, game.CurrentPlayer);
    }

    [Fact]
    public void AutomaticallyPassesAPlayerWithoutLegalMoves()
    {
        var board = EmptyBoard();
        board[4, 4] = OthelloDisc.Black;
        board[4, 5] = OthelloDisc.White;
        board[4, 6] = OthelloDisc.Black;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.Equal(OthelloDisc.White, game.CurrentPlayer);
        Assert.Equal(OthelloDisc.Black, game.LastPassedPlayer);
        Assert.NotEmpty(game.GetLegalMoves(OthelloDisc.White));
    }

    [Fact]
    public void AfterMovePassesOpponentAndKeepsTurnWhenMoverCanPlayAgain()
    {
        var board = EmptyBoard();
        board[3, 4] = OthelloDisc.White;
        board[3, 5] = OthelloDisc.Black;
        board[3, 6] = OthelloDisc.Black;
        board[5, 3] = OthelloDisc.White;
        board[5, 4] = OthelloDisc.Black;
        board[5, 5] = OthelloDisc.Black;
        board[5, 6] = OthelloDisc.Black;
        board[5, 7] = OthelloDisc.Black;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.True(game.TryPlay(new OthelloPosition(3, 3)));

        Assert.Equal(OthelloDisc.Black, game.CurrentPlayer);
        Assert.Equal(OthelloDisc.White, game.LastPassedPlayer);
        Assert.Empty(game.GetLegalMoves(OthelloDisc.White));
        Assert.NotEmpty(game.GetLegalMoves(OthelloDisc.Black));
        Assert.Equal(OthelloState.Playing, game.State);
    }

    [Fact]
    public void FinishesWhenTheBoardFillsAndReturnsCorrectScoreAndOutcome()
    {
        var board = FilledBoard(OthelloDisc.Black);
        board[7, 6] = OthelloDisc.White;
        board[7, 7] = OthelloDisc.Empty;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.True(game.TryPlay(new OthelloPosition(7, 7)));

        Assert.Equal(OthelloState.BlackWins, game.State);
        Assert.Equal(new OthelloMatchResult(OthelloDisc.Black, MatchOutcome.Win, 63, 0, 1, game.Result!.FinishedAtUtc), game.Result);
    }

    [Fact]
    public void FinishesWithDrawWhenTheFinalDiscCountsAreEqual()
    {
        var board = FilledBoard(OthelloDisc.Black);
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
            if ((row * OthelloGame.BoardSize + column) % 2 == 1) board[row, column] = OthelloDisc.White;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.Equal(OthelloState.Draw, game.State);
        Assert.Equal(MatchOutcome.Draw, game.Result!.Outcome);
        Assert.Null(game.Result.Winner);
        Assert.Equal(game.BlackCount, game.WhiteCount);
    }

    [Fact]
    public void EndsWhenNeitherPlayerHasMovesEvenIfSpacesRemain()
    {
        var board = EmptyBoard();
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
            board[row, column] = OthelloDisc.Black;
        board[0, 0] = OthelloDisc.White;
        board[7, 7] = OthelloDisc.Empty;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        Assert.Equal(OthelloState.BlackWins, game.State);
        Assert.NotNull(game.Result);
        Assert.False(game.TryPlay(new OthelloPosition(7, 7)));
    }

    private static OthelloDisc[,] EmptyBoard() => new OthelloDisc[OthelloGame.BoardSize, OthelloGame.BoardSize];

    private static OthelloDisc[,] FilledBoard(OthelloDisc disc)
    {
        var board = EmptyBoard();
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
            board[row, column] = disc;
        return board;
    }
}
