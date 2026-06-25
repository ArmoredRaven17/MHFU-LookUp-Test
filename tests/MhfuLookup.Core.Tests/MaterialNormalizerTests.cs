using MhfuLookup.Core.Domain;
using System.Text.Json.Nodes;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class MaterialNormalizerTests
{
    [Fact]
    public void StripCount_WithPrefix()
    {
        Assert.Equal("Basarios Shell", MaterialNormalizer.StripCount("3 Basarios Shell"));
        Assert.Equal("Rathalos Wing", MaterialNormalizer.StripCount("1 Rathalos Wing"));
        Assert.Equal("Sm Monster Bone", MaterialNormalizer.StripCount("12 Sm Monster Bone"));
    }

    [Fact]
    public void StripCount_WithoutPrefix()
    {
        Assert.Equal("Honey", MaterialNormalizer.StripCount("Honey"));
        Assert.Equal("Mountain Herb", MaterialNormalizer.StripCount("Mountain Herb"));
    }

    [Fact]
    public void StripCount_PreservesInternalDigits()
    {
        Assert.Equal("3D Goldenfish", MaterialNormalizer.StripCount("3D Goldenfish"));
    }

    [Fact]
    public void ExtractItem_FromString() =>
        Assert.Equal("Honey", MaterialNormalizer.ExtractItemName("Honey"));

    [Fact]
    public void ExtractItem_FromDictWithPct()
    {
        var node = JsonNode.Parse("""{"item": "Basarios Shell", "pct": "30%"}""");
        Assert.Equal("Basarios Shell", MaterialNormalizer.ExtractItemName(node));
    }

    [Fact]
    public void ExtractItem_FromDictWithPoints()
    {
        var node = JsonNode.Parse("""{"item": "Honey", "points": "8"}""");
        Assert.Equal("Honey", MaterialNormalizer.ExtractItemName(node));
    }

    [Fact]
    public void ExtractItem_HandlesMissingItemKey()
    {
        var node = JsonNode.Parse("""{"pct": "30%"}""");
        Assert.Equal("", MaterialNormalizer.ExtractItemName(node));
    }

    [Fact]
    public void CanonicalMaterial_Idempotent()
    {
        var name = MaterialNormalizer.CanonicalMaterial("Rathalos Scale");
        Assert.Equal(name, MaterialNormalizer.CanonicalMaterial(name));
    }

    [Fact]
    public void CanonicalMaterial_Trims() =>
        Assert.Equal("Rathalos Scale", MaterialNormalizer.CanonicalMaterial("  Rathalos Scale  "));

    [Fact]
    public void CanonicalMaterial_PreservesCase() =>
        Assert.NotEqual(MaterialNormalizer.CanonicalMaterial("Akantor"),
                        MaterialNormalizer.CanonicalMaterial("akantor"));
}
