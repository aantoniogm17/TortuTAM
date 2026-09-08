using TortuTAM.Api.Models;

namespace TortuTAM.Api.Services;

public interface IJwtTokenService
{
    JwtTokenResult CrearToken(ApplicationUser usuario, IList<string> roles);
}

public record JwtTokenResult(string Token, DateTime ExpiraEnUtc);
