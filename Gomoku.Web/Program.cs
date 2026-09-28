using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Gomoku.Web;
using Gomoku.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");
builder.Services.AddScoped<PlayerStatsStore>();
builder.Services.AddScoped<PlayerSettingsStore>();
await builder.Build().RunAsync();
