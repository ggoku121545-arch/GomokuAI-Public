# GomokuAI

모바일과 데스크톱 브라우저에서 실행되는 15×15 오목 게임입니다. Blazor WebAssembly PWA이므로 첫 로드 후에는 오프라인에서도 실행할 수 있으며, 게임 중 서버나 네트워크를 사용하지 않습니다.

## 프로젝트 구조

- `Gomoku.Core` — 보드 상태, 착수 검증, 승리 판정, 브라우저에서 동작하는 결정론적 AI
- `Gomoku.Web` — 반응형 Blazor WebAssembly PWA 사용자 인터페이스
- `Gomoku.Core.Tests` — 핵심 규칙과 AI의 자동화 테스트

## 실행하기

.NET 10 SDK를 설치한 뒤 저장소 루트에서 다음을 실행합니다.

```bash
dotnet restore
dotnet run --project Gomoku.Web
```

출력되는 로컬 주소를 모바일 또는 데스크톱 브라우저에서 엽니다. HTTPS로 배포하면 브라우저의 **앱 설치** 메뉴를 통해 PWA로 설치할 수 있습니다. 배포 빌드는 `dotnet publish Gomoku.Web -c Release`로 만들 수 있습니다.

## Visual Studio에서 열기

Visual Studio 2022에서 **ASP.NET 및 웹 개발** 워크로드와 .NET 10 SDK를 설치하고 `GomokuAI.sln`을 엽니다. `Gomoku.Web`을 시작 프로젝트로 지정한 뒤 실행합니다.

## 로컬 AI

AI는 외부 서비스 없이 브라우저의 WebAssembly 안에서 실행됩니다. 가능한 수를 일정한 순서로 평가하여 즉시 이기는 수, 상대의 즉시 승리를 막는 수, 공격 패턴을 만드는 수, 상대의 강한 패턴을 차단하는 수 순으로 선택합니다. 동일한 보드에서는 항상 같은 수를 선택하며, 빈 칸에만 착수합니다.

**OpenAI API 토큰, API 키, 백엔드 및 데이터베이스가 필요하지 않습니다.**

## 테스트

```bash
dotnet test
```
