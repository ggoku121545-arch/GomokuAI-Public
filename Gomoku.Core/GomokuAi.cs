namespace Gomoku.Core;

public sealed class GomokuAi
{
    public Position? ChooseMove(Game game, Stone stone = Stone.White)
    {
        if (game.Result != GameResult.Playing || game.CurrentTurn != stone) return null;
        var legal = game.EmptyPositions().ToArray();
        if (legal.Length == 0) return null;

        var winning = legal.FirstOrDefault(p => game.WouldWin(p, stone));
        if (game.WouldWin(winning, stone)) return winning;
        var opponent = Game.Opponent(stone);
        var block = legal.FirstOrDefault(p => game.WouldWin(p, opponent));
        if (game.WouldWin(block, opponent)) return block;

        var center = Game.BoardSize / 2;
        return legal
            .Select(p => new
            {
                Position = p,
                Score = game.PatternScore(p, stone) * 3 + game.PatternScore(p, opponent) * 2
                        - Math.Abs(p.Row - center) - Math.Abs(p.Column - center)
            })
            .OrderByDescending(candidate => candidate.Score)
            .ThenBy(candidate => candidate.Position.Row)
            .ThenBy(candidate => candidate.Position.Column)
            .First().Position;
    }
}
