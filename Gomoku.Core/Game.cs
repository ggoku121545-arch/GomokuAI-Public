namespace Gomoku.Core;

public enum Stone { Empty, Black, White }
public enum GameResult { Playing, BlackWins, WhiteWins, Draw }
public readonly record struct Position(int Row, int Column);
public readonly record struct Move(Position Position, Stone Stone);

public sealed class Game
{
    public const int BoardSize = 15;
    private static readonly (int Row, int Column)[] Directions = [(0, 1), (1, 0), (1, 1), (1, -1)];
    private readonly Stone[,] _board = new Stone[BoardSize, BoardSize];
    private readonly List<Move> _moves = [];

    public Stone CurrentTurn { get; private set; } = Stone.Black;
    public GameResult Result { get; private set; } = GameResult.Playing;
    public IReadOnlyList<Move> Moves => _moves;
    public Position? LastMove => _moves.Count == 0 ? null : _moves[^1].Position;
    public IReadOnlySet<Position> WinningLine { get; private set; } = new HashSet<Position>();
    public Stone this[int row, int column] => IsInside(row, column) ? _board[row, column] : Stone.Empty;

    public bool TryPlay(Position position)
    {
        if (Result != GameResult.Playing || !IsInside(position.Row, position.Column) || _board[position.Row, position.Column] != Stone.Empty)
            return false;

        var stone = CurrentTurn;
        _board[position.Row, position.Column] = stone;
        _moves.Add(new Move(position, stone));
        var line = FindWinningLine(position, stone);
        if (line.Count >= 5)
        {
            WinningLine = line.ToHashSet();
            Result = stone == Stone.Black ? GameResult.BlackWins : GameResult.WhiteWins;
        }
        else if (_moves.Count == BoardSize * BoardSize)
            Result = GameResult.Draw;
        else
            CurrentTurn = Opponent(stone);
        return true;
    }

    public bool UndoRound()
    {
        if (_moves.Count == 0) return false;
        var removeCount = _moves[^1].Stone == Stone.White && _moves.Count >= 2 ? 2 : 1;
        for (var i = 0; i < removeCount; i++)
        {
            var move = _moves[^1];
            _board[move.Position.Row, move.Position.Column] = Stone.Empty;
            _moves.RemoveAt(_moves.Count - 1);
        }
        Result = GameResult.Playing;
        WinningLine = new HashSet<Position>();
        CurrentTurn = Stone.Black;
        return true;
    }

    public void Reset()
    {
        Array.Clear(_board);
        _moves.Clear();
        CurrentTurn = Stone.Black;
        Result = GameResult.Playing;
        WinningLine = new HashSet<Position>();
    }

    public IEnumerable<Position> EmptyPositions()
    {
        for (var row = 0; row < BoardSize; row++)
            for (var column = 0; column < BoardSize; column++)
                if (_board[row, column] == Stone.Empty) yield return new(row, column);
    }

    public bool WouldWin(Position position, Stone stone)
    {
        if (!IsInside(position.Row, position.Column) || _board[position.Row, position.Column] != Stone.Empty) return false;
        return Directions.Any(d => 1 + Count(position, d, stone) + Count(position, (-d.Row, -d.Column), stone) >= 5);
    }

    internal int PatternScore(Position position, Stone stone)
    {
        var score = 0;
        foreach (var direction in Directions)
        {
            var forward = Count(position, direction, stone);
            var backward = Count(position, (-direction.Row, -direction.Column), stone);
            var run = 1 + forward + backward;
            var open = IsEmpty(position.Row + direction.Row * (forward + 1), position.Column + direction.Column * (forward + 1)) ? 1 : 0;
            open += IsEmpty(position.Row - direction.Row * (backward + 1), position.Column - direction.Column * (backward + 1)) ? 1 : 0;
            score += run * run * 12 + open * run * 8;
        }
        return score;
    }

    private List<Position> FindWinningLine(Position origin, Stone stone)
    {
        foreach (var direction in Directions)
        {
            var line = new List<Position> { origin };
            Add(line, origin, direction, stone);
            Add(line, origin, (-direction.Row, -direction.Column), stone);
            if (line.Count >= 5) return line;
        }
        return [];
    }

    private void Add(List<Position> line, Position origin, (int Row, int Column) direction, Stone stone)
    {
        for (var step = 1; ; step++)
        {
            var p = new Position(origin.Row + direction.Row * step, origin.Column + direction.Column * step);
            if (!IsInside(p.Row, p.Column) || _board[p.Row, p.Column] != stone) break;
            line.Add(p);
        }
    }

    private int Count(Position origin, (int Row, int Column) direction, Stone stone)
    {
        var count = 0;
        for (var step = 1; ; step++)
        {
            var row = origin.Row + direction.Row * step;
            var column = origin.Column + direction.Column * step;
            if (!IsInside(row, column) || _board[row, column] != stone) return count;
            count++;
        }
    }

    private bool IsEmpty(int row, int column) => IsInside(row, column) && _board[row, column] == Stone.Empty;
    public static bool IsInside(int row, int column) => row >= 0 && row < BoardSize && column >= 0 && column < BoardSize;
    public static Stone Opponent(Stone stone) => stone == Stone.Black ? Stone.White : Stone.Black;
}
