namespace Gomoku.Core;

/// <summary>A small alpha-beta Othello opponent that can be used by any UI or host.</summary>
public static class OthelloAi
{
    private const int DefaultSearchDepth = 4;
    private const int NodeBudget = 30_000;
    private const int WinScore = 100_000;

    private static readonly int[,] PositionWeights =
    {
        { 100, -20, 10, 5, 5, 10, -20, 100 },
        { -20, -50, -2, -2, -2, -2, -50, -20 },
        { 10, -2, 5, 1, 1, 5, -2, 10 },
        { 5, -2, 1, 0, 0, 1, -2, 5 },
        { 5, -2, 1, 0, 0, 1, -2, 5 },
        { 10, -2, 5, 1, 1, 5, -2, 10 },
        { -20, -50, -2, -2, -2, -2, -50, -20 },
        { 100, -20, 10, 5, 5, 10, -20, 100 }
    };

    /// <summary>Finds a legal move using a depth-limited, position-aware alpha-beta search.</summary>
    public static OthelloPosition? ChooseMove(OthelloGame game, OthelloDisc player, int searchDepth = DefaultSearchDepth)
    {
        ArgumentNullException.ThrowIfNull(game);
        if (player is not (OthelloDisc.Black or OthelloDisc.White) ||
            game.State != OthelloState.Playing ||
            game.CurrentPlayer != player)
            return null;

        var moves = OrderMoves(game, game.GetLegalMoves(player));
        if (moves.Count == 0) return null;

        var context = new SearchContext(player, Math.Clamp(searchDepth, 1, 8));
        var bestMove = moves[0];
        var bestScore = int.MinValue;
        var alpha = int.MinValue;

        foreach (var move in moves)
        {
            var child = CopyAndPlay(game, move);
            var score = Search(child, context.Depth - 1, alpha, int.MaxValue, context);
            if (score > bestScore)
            {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.Max(alpha, bestScore);
            if (context.Nodes >= NodeBudget) break;
        }

        return bestMove;
    }

    private static int Search(OthelloGame game, int depth, int alpha, int beta, SearchContext context)
    {
        context.Nodes++;
        if (game.State != OthelloState.Playing) return EvaluateFinal(game, context.Player);
        if (depth <= 0 || context.Nodes >= NodeBudget) return EvaluatePosition(game, context.Player);

        var player = game.CurrentPlayer;
        var moves = OrderMoves(game, game.GetLegalMoves(player));
        if (moves.Count == 0) return EvaluatePosition(game, context.Player);

        if (player == context.Player)
        {
            var value = int.MinValue;
            foreach (var move in moves)
            {
                value = Math.Max(value, Search(CopyAndPlay(game, move), depth - 1, alpha, beta, context));
                alpha = Math.Max(alpha, value);
                if (beta <= alpha || context.Nodes >= NodeBudget) break;
            }
            return value;
        }

        var worstValue = int.MaxValue;
        foreach (var move in moves)
        {
            worstValue = Math.Min(worstValue, Search(CopyAndPlay(game, move), depth - 1, alpha, beta, context));
            beta = Math.Min(beta, worstValue);
            if (beta <= alpha || context.Nodes >= NodeBudget) break;
        }
        return worstValue;
    }

    private static OthelloGame CopyAndPlay(OthelloGame game, OthelloPosition move)
    {
        var board = new OthelloDisc[OthelloGame.BoardSize, OthelloGame.BoardSize];
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
            board[row, column] = game[row, column];

        var copy = OthelloGame.FromPosition(board, game.CurrentPlayer);
        copy.TryPlay(move);
        return copy;
    }

    private static List<OthelloPosition> OrderMoves(OthelloGame game, IReadOnlyList<OthelloPosition> moves) =>
        moves.OrderByDescending(move => PositionWeights[move.Row, move.Column] * 10 + game.GetFlips(move, game.CurrentPlayer).Count)
            .ToList();

    private static int EvaluatePosition(OthelloGame game, OthelloDisc player)
    {
        var opponent = OthelloGame.Opponent(player);
        var positional = 0;
        for (var row = 0; row < OthelloGame.BoardSize; row++)
        for (var column = 0; column < OthelloGame.BoardSize; column++)
        {
            positional += game[row, column] switch
            {
                var disc when disc == player => PositionWeights[row, column],
                var disc when disc == opponent => -PositionWeights[row, column],
                _ => 0
            };
        }

        var mobility = game.GetLegalMoves(player).Count - game.GetLegalMoves(opponent).Count;
        var discDifference = player == OthelloDisc.Black
            ? game.BlackCount - game.WhiteCount
            : game.WhiteCount - game.BlackCount;
        var filled = OthelloGame.BoardSize * OthelloGame.BoardSize - game.EmptyCount;
        var discWeight = filled > 44 ? 3 : 1;

        return positional * 4 + mobility * 9 + discDifference * discWeight;
    }

    private static int EvaluateFinal(OthelloGame game, OthelloDisc player)
    {
        var difference = player == OthelloDisc.Black
            ? game.BlackCount - game.WhiteCount
            : game.WhiteCount - game.BlackCount;
        return difference == 0 ? 0 : Math.Sign(difference) * (WinScore + Math.Abs(difference));
    }

    private sealed class SearchContext(OthelloDisc player, int depth)
    {
        public OthelloDisc Player { get; } = player;
        public int Depth { get; } = depth;
        public int Nodes { get; set; }
    }
}
