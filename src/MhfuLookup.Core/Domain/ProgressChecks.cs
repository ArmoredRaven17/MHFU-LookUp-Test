using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Domain;

/// <summary>Material/piece availability checks. Mirrors src/progress.py.</summary>
public static class ProgressChecks
{
    public static bool IsMaterialAvailable(
        string material,
        HunterProgress progress,
        MaterialIndex index,
        bool treatUnsourcedAsAvailable = true)
    {
        var avail = index.Availability(material);
        if (avail is null) return treatUnsourcedAsAvailable;
        return avail.Sources.Any(progress.IsAtOrPast);
    }

    public static bool IsPieceAvailable(
        ArmorPiece piece,
        HunterProgress progress,
        MaterialIndex index,
        bool treatUnsourcedAsAvailable = true)
    {
        if (!RankAvailable(piece.Rank, progress)) return false;
        foreach (var raw in piece.Materials)
        {
            var canon = MaterialNormalizer.CanonicalMaterial(MaterialNormalizer.StripCount(raw));
            if (!IsMaterialAvailable(canon, progress, index, treatUnsourcedAsAvailable)) return false;
        }
        return true;
    }

    /// <summary>Coarse rank → availability check, used when material data is missing.</summary>
    private static bool RankAvailable(string rank, HunterProgress progress) => rank switch
    {
        "Low" => progress.VillageStar >= 1 || progress.GuildStar >= 1,
        "High" => progress.VillageStar >= 7 || progress.GuildStar >= 6,
        "G" => progress.GuildGStar >= 1,
        _ => true,  // unknown rank — be permissive
    };

    public static List<ArmorPiece> FilterByProgress(
        IEnumerable<ArmorPiece> pieces, HunterProgress? progress, MaterialIndex index)
    {
        if (progress is null) return pieces.ToList();
        return pieces.Where(p => IsPieceAvailable(p, progress, index)).ToList();
    }
}
