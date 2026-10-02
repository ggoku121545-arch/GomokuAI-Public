namespace Gomoku.Core;

public enum OthelloDisc { Empty, Black, White }
public enum OthelloState { Playing, BlackWins, WhiteWins, Draw }
public readonly record struct OthelloPosition(int Row, int Column);

/// <summary>Result from a completed local two-player Othello match. Black is player one.</summary>
public sealed record OthelloMatchResult(
    OthelloDisc? Winner,
    MatchOutcome Outcome,
    int BlackCount,
    int WhiteCount,
    int MoveCount,
    DateTimeOffset FinishedAtUtc);

/// <summary>Rules and mutable board state for an 8x8 Othello match.</summary>
public sealed class OthelloGame
{
    public const int BoardSize = 8;
    private static readonly (int Row, int Column)[] Directions =
    [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),            (0, 1),
        (1, -1),  (1, 0),   (1, 1)
    ];

    private readonly OthelloDisc[,] _board = new OthelloDisc[BoardSize, BoardSize];

    public OthelloGame()
    {
        _board[3, 3] = OthelloDisc.Black;
        _board[4, 4] = OthelloDisc.Black;
        _board[3, 4] = OthelloDisc.White;
        _board[4, 3] = OthelloDisc.White;
    }

    private OthelloGame(OthelloDisc[,] position, OthelloDisc currentPlayer)
    {
        if (position.GetLength(0) != BoardSize || position.GetLength(1) != BoardSize)
            throw new ArgumentException("An Othello position must be an 8x8 board.", nameof(position));
        if (currentPlayer is not (OthelloDisc.Black or OthelloDisc.White))
            throw new ArgumentOutOfRangeException(nameof(currentPlayer));

        for (var row = 0; row < BoardSize; row++)
        for (var column = 0; column < BoardSize; column++)
        {
            var disc = position[row, column];
            if (disc is not (OthelloDisc.Empty or OthelloDisc.Black or OthelloDisc.White))
                throw new ArgumentException("The board contains an invalid disc value.", nameof(position));
            _board[row, column] = disc;
        }

        CurrentPlayer = currentPlayer;
        ResolveInitialTurn();
    }

    public OthelloDisc CurrentPlayer { get; private set; } = OthelloDisc.Black;
    public OthelloState State { get; private set; } = OthelloState.Playing;
    public OthelloPosition? LastMove { get; private set; }
    public IReadOnlyList<OthelloPosition> LastFlippedStones { get; private set; } = [];
    public OthelloDisc? LastPassedPlayer { get; private set; }
    public int MoveCount { get; private set; }
    public OthelloMatchResult? Result { get; private set; }
    public int BlackCount => Count(OthelloDisc.Black);
    public int WhiteCount => Count(OthelloDisc.White);
    public int EmptyCount => BoardSize * BoardSize - BlackCount - WhiteCount;
    public OthelloDisc this[int row, int column] => IsInside(row, column) ? _board[row, column] : OthelloDisc.Empty;
    public OthelloDisc this[OthelloPosition position] => this[position.Row, position.Column];

    /// <summary>Creates a copied position, useful for replay, search, and isolated rules tests.</summary>
    public static OthelloGame FromPosition(OthelloDisc[,] position, OthelloDisc currentPlayer) =>
        new(position ?? throw new ArgumentNullException(nameof(position)), currentPlayer);

    public IReadOnlyList<OthelloPosition> GetLegalMoves(OthelloDisc player)
    {
        if (player is not (OthelloDisc.Black or OthelloDisc.White)) return [];

        var moves = new List<OthelloPosition>();
        for (var row = 0; row < BoardSize; row++)
        for (var column = 0; column < BoardSize; column++)
        {
            var position = new OthelloPosition(row, column);
            if (_board[row, column] == OthelloDisc.Empty && GetFlips(position, player).Count > 0)
                moves.Add(position);
        }
        return moves;
    }

    public bool IsLegalMove(OthelloPosition position, OthelloDisc player) =>
        IsInside(position.Row, position.Column) &&
        _board[position.Row, position.Column] == OthelloDisc.Empty &&
        GetFlips(position, player).Count > 0;

    /// <summary>Returns every opposing disc captured in all eight directions.</summary>
    public IReadOnlyList<OthelloPosition> GetFlips(OthelloPosition position, OthelloDisc player)
    {
        if (player is not (OthelloDisc.Black or OthelloDisc.White) ||
            !IsInside(position.Row, position.Column) ||
            _board[position.Row, position.Column] != OthelloDisc.Empty)
            return [];

        var opponent = Opponent(player);
        var flips = new List<OthelloPosition>();
        foreach (var direction in Directions)
        {
            var ray = new List<OthelloPosition>();
            var row = position.Row + direction.Row;
            var column = position.Column + direction.Column;
            while (IsInside(row, column) && _board[row, column] == opponent)
            {
                ray.Add(new OthelloPosition(row, column));
                row += direction.Row;
                column += direction.Column;
            }

            if (ray.Count > 0 && IsInside(row, column) && _board[row, column] == player)
                flips.AddRange(ray);
        }
        return flips;
    }

    public bool TryPlay(OthelloPosition position)
    {
        if (State != OthelloState.Playing) return false;
        var flips = GetFlips(position, CurrentPlayer);
        if (flips.Count == 0) return false;

        var playedBy = CurrentPlayer;
        _board[position.Row, position.Column] = playedBy;
        foreach (var flip in flips) _board[flip.Row, flip.Column] = playedBy;

        LastMove = position;
        LastFlippedStones = flips;
        LastPassedPlayer = null;
        MoveCount++;

        if (EmptyCount == 0)
        {
            Finish();
            return true;
        }

        var nextPlayer = Opponent(playedBy);
        if (GetLegalMoves(nextPlayer).Count > 0)
        {
            CurrentPlayer = nextPlayer;
            return true;
        }

        LastPassedPlayer = nextPlayer;
        if (GetLegalMoves(playedBy).Count > 0)
        {
            CurrentPlayer = playedBy;
            return true;
        }

        Finish();
        return true;
    }

    public void Reset()
    {
        Array.Clear(_board);
        _board[3, 3] = OthelloDisc.Black;
        _board[4, 4] = OthelloDisc.Black;
        _board[3, 4] = OthelloDisc.White;
        _board[4, 3] = OthelloDisc.White;
        CurrentPlayer = OthelloDisc.Black;
        State = OthelloState.Playing;
        LastMove = null;
        LastFlippedStones = [];
        LastPassedPlayer = null;
        MoveCount = 0;
        Result = null;
    }

    public static bool IsInside(int row, int column) => row is >= 0 and < BoardSize && column is >= 0 and < BoardSize;
    public static OthelloDisc Opponent(OthelloDisc player) => player == OthelloDisc.Black ? OthelloDisc.White : OthelloDisc.Black;

    private int Count(OthelloDisc disc)
    {
        var count = 0;
        foreach (var cell in _board)
            if (cell == disc) count++;
        return count;
    }

    private void ResolveInitialTurn()
    {
        if (EmptyCount == 0 || (GetLegalMoves(OthelloDisc.Black).Count == 0 && GetLegalMoves(OthelloDisc.White).Count == 0))
        {
            Finish();
            return;
        }

        if (GetLegalMoves(CurrentPlayer).Count == 0)
        {
            LastPassedPlayer = CurrentPlayer;
            CurrentPlayer = Opponent(CurrentPlayer);
        }
    }

    private void Finish()
    {
        var black = BlackCount;
        var white = WhiteCount;
        var winner = black == white ? (OthelloDisc?)null : black > white ? OthelloDisc.Black : OthelloDisc.White;
        State = winner switch
        {
            OthelloDisc.Black => OthelloState.BlackWins,
            OthelloDisc.White => OthelloState.WhiteWins,
            _ => OthelloState.Draw
        };
        Result = new OthelloMatchResult(
            winner,
            winner switch
            {
                OthelloDisc.Black => MatchOutcome.Win,
                OthelloDisc.White => MatchOutcome.Loss,
                _ => MatchOutcome.Draw
            },
            black,
            white,
            MoveCount,
            DateTimeOffset.UtcNow);
    }
}
