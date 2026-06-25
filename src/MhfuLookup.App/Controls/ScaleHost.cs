using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.Foundation;

namespace MhfuLookup.App.Controls;

/// <summary>
/// A single-child panel that applies a uniform zoom that affects layout (a poor man's
/// LayoutTransform, which WinUI doesn't provide). The child is measured/arranged at
/// finalSize / scale, then scaled up to fill finalSize — so the UI both zooms and reflows.
/// </summary>
public sealed partial class ScaleHost : Panel
{
    public static readonly DependencyProperty ScaleProperty =
        DependencyProperty.Register(nameof(Scale), typeof(double), typeof(ScaleHost),
            new PropertyMetadata(1.0, (d, _) => ((ScaleHost)d).OnScaleChanged()));

    public double Scale
    {
        get => (double)GetValue(ScaleProperty);
        set => SetValue(ScaleProperty, value);
    }

    private void OnScaleChanged()
    {
        InvalidateMeasure();
        InvalidateArrange();
    }

    private double S => Scale <= 0 ? 1.0 : Scale;

    protected override Size MeasureOverride(Size availableSize)
    {
        if (Children.Count == 0) return new Size(0, 0);
        var child = Children[0];
        var inner = new Size(
            double.IsInfinity(availableSize.Width) ? availableSize.Width : availableSize.Width / S,
            double.IsInfinity(availableSize.Height) ? availableSize.Height : availableSize.Height / S);
        child.Measure(inner);
        return new Size(child.DesiredSize.Width * S, child.DesiredSize.Height * S);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        if (Children.Count == 0) return finalSize;
        var child = Children[0];
        child.Arrange(new Rect(0, 0, finalSize.Width / S, finalSize.Height / S));
        child.RenderTransform = new ScaleTransform { ScaleX = S, ScaleY = S };
        return finalSize;
    }
}
