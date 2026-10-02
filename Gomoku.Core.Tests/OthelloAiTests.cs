using Gomoku.Core;
using Xunit;

namespace Gomoku.Core.Tests;

public class OthelloAiTests
{
    [Fact]
    public void ChoosesALegalMoveForTheCurrentPlayer()
    {
        var game = new OthelloGame();

        var move = OthelloAi.ChooseMove(game, OthelloDisc.Black);

        Assert.NotNull(move);
        Assert.Contains(move.Value, game.GetLegalMoves(OthelloDisc.Black));
        Assert.Equal(4, game.GetLegalMoves(OthelloDisc.Black).Count);
    }

    [Fact]
    public void PrefersAnAvailableCorner()
    {
        var board = new OthelloDisc[OthelloGame.BoardSize, OthelloGame.BoardSize];
        board[0, 1] = OthelloDisc.White;
        board[0, 2] = OthelloDisc.Black;
        board[4, 5] = OthelloDisc.White;
        board[4, 6] = OthelloDisc.Black;
        var game = OthelloGame.FromPosition(board, OthelloDisc.Black);

        var move = OthelloAi.ChooseMove(game, OthelloDisc.Black);

        Assert.Equal(new OthelloPosition(0, 0), move);
    }

    [Fact]
    public void DoesNotChooseWhenItIsNotTheAiTurnOrTheGameIsOver()
    {
        var game = new OthelloGame();

        Assert.Null(OthelloAi.ChooseMove(game, OthelloDisc.White));

        var finished = OthelloGame.FromPosition(FilledBoard(OthelloDisc.Black), OthelloDisc.Black);
        Assert.Null(OthelloAi.ChooseMove(finished, OthelloDisc.Black));
    }

    private static OthelloDisc[,] FilledBoard(OthelloDisc disc)
    {
        var board = new OthelloDisc[OthelloGame.BoardSize, OthelloGame.BoardSize];
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
            board[row, column] = disc;
        return board;
    }
}
