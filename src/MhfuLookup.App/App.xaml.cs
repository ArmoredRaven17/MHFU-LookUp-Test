using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;

namespace MhfuLookup.App;

public partial class App : Application
{
    private Window? _window;

    /// <summary>The main window (used e.g. to parent file pickers).</summary>
    public static Window? Window { get; private set; }

    /// <summary>Crash log written next to the executable.</summary>
    public static readonly string CrashLogPath = Path.Combine(AppContext.BaseDirectory, "mhfu_crash.log");

    public App()
    {
        InitializeComponent();

        // Capture any unhandled exception so we get a stack trace instead of a silent close.
        UnhandledException += (_, e) =>
        {
            Log("UI", e.Exception);
            e.Handled = true;   // keep the app alive so the log can be read
        };
        AppDomain.CurrentDomain.UnhandledException += (_, e) => Log("AppDomain", e.ExceptionObject as Exception);
        TaskScheduler.UnobservedTaskException += (_, e) => { Log("Task", e.Exception); e.SetObserved(); };
    }

    private static void Log(string source, Exception? ex)
    {
        try
        {
            File.AppendAllText(CrashLogPath, $"[{source}] {DateTime.Now:O}\n{ex}\n\n");
        }
        catch { /* logging must never throw */ }
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        Window = _window;
        _window.Activate();
    }
}
