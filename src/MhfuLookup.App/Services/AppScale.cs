namespace MhfuLookup.App.Services;

/// <summary>App-wide UI zoom factor, shared between the Settings tab and the main window.</summary>
public static class AppScale
{
    private static double _current = 1.0;

    /// <summary>Raised when the scale changes so the window can apply it live.</summary>
    public static event Action<double>? Changed;

    public static double Current
    {
        get => _current;
        set
        {
            if (Math.Abs(_current - value) < 0.001) return;
            _current = value;
            Changed?.Invoke(value);
        }
    }
}
