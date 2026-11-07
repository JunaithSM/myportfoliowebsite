# ==============================================================================
# Local HTML Builder & Site Compiler (Zero-Dependency PowerShell Engine)
# ==============================================================================
param(
    [switch]$Watch = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ScriptDir) { $ScriptDir = Get-Location }

$SrcDir = Join-Path $ScriptDir "src"
$DataDir = Join-Path $ScriptDir "data"
$DistDir = Join-Path $ScriptDir "dist"
$DataFile = Join-Path $DataDir "site.json"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " [HTML Builder] Initializing Site Compilation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

function Build-Site {
    $StartTime = Get-Date

    # 1. Ensure Directory Structure
    $CssDistDir = Join-Path $DistDir "css"
    $AssetsDistDir = Join-Path $DistDir "assets"
    $JsDistDir = Join-Path $DistDir "js"
    
    if (-not (Test-Path $DistDir)) { New-Item -ItemType Directory -Path $DistDir -Force | Out-Null }
    if (-not (Test-Path $CssDistDir)) { New-Item -ItemType Directory -Path $CssDistDir -Force | Out-Null }
    if (-not (Test-Path $AssetsDistDir)) { New-Item -ItemType Directory -Path $AssetsDistDir -Force | Out-Null }
    if (-not (Test-Path $JsDistDir)) { New-Item -ItemType Directory -Path $JsDistDir -Force | Out-Null }

    # 2. Load Data
    if (-not (Test-Path $DataFile)) {
        Write-Error "Data file not found at: $DataFile"
        return
    }
    $RawJson = Get-Content -Path $DataFile -Raw -Encoding UTF8
    $Data = $RawJson | ConvertFrom-Json

    # Page-Specific SEO Metadata Map
    $PageMeta = @{
        "index.html" = @{
            title = "$($Data.site.fullName) ($($Data.site.nickname)) - Systems Architect & Software Engineer"
            description = "$($Data.site.description)"
            canonical = "$($Data.site.url)/"
            robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        }
        "about.html" = @{
            title = "About $($Data.site.fullName) ($($Data.site.nickname)) - Systems Architect"
            description = "Engineering background, architectural principles, zero-bloat systems, and career record of $($Data.site.fullName)."
            canonical = "$($Data.site.url)/about"
            robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        }
        "projects.html" = @{
            title = "Engineering Projects - $($Data.site.fullName) ($($Data.site.nickname))"
            description = "Software engineering and gameplay programming projects by $($Data.site.fullName): Nexus Gate, Air Attack Force, Jarvis AI, Holy Fraud, and interactive systems."
            canonical = "$($Data.site.url)/projects"
            robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        }
        "contact.html" = @{
            title = "Contact $($Data.site.fullName) ($($Data.site.nickname)) - Architecture Consultations"
            description = "Get in touch with $($Data.site.fullName) ($($Data.site.nickname)) for systems architecture consultations, latency profiling, and engineering roles."
            canonical = "$($Data.site.url)/contact"
            robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        }
        "404.html" = @{
            title = "404 Not Found - $($Data.site.fullName)"
            description = "The requested resource could not be found."
            canonical = ""
            robots = "noindex, follow"
        }
    }

    # 3. Concatenate and Minify CSS
    $CssFiles = @("reset.css", "variables.css", "layout.css", "components.css", "utilities.css", "print.css")
    $CombinedCss = ""

    foreach ($file in $CssFiles) {
        $path = Join-Path $SrcDir "css" | Join-Path -ChildPath $file
        if (Test-Path $path) {
            $CombinedCss += "`n/* === $file === */`n" + (Get-Content -Path $path -Raw -Encoding UTF8)
        }
    }

    # Minify CSS: Strip comments, reduce whitespace, clean punctuation spacing
    $MinifiedCss = $CombinedCss -replace '/\*[\s\S]*?\*/', ''
    $MinifiedCss = $MinifiedCss -replace '\s+', ' '
    $MinifiedCss = $MinifiedCss -replace '\s*([\{\}:;,>])\s*', '$1'
    $MinifiedCss = $MinifiedCss -replace ';\}', '}'
    $MinifiedCss = $MinifiedCss.Trim()

    $OutputCssPath = Join-Path $CssDistDir "style.css"
    [System.IO.File]::WriteAllText($OutputCssPath, $MinifiedCss, [System.Text.Encoding]::UTF8)
    $CssKb = [math]::Round(((Get-Item $OutputCssPath).Length / 1KB), 2)
    Write-Host " [CSS] Bundled & minified: dist/css/style.css ($CssKb KB)" -ForegroundColor Green

    # 4. Load Partials
    $PartialsDir = Join-Path $SrcDir "partials"
    $Partials = @{}
    if (Test-Path $PartialsDir) {
        Get-ChildItem -Path $PartialsDir -Filter "*.html" | ForEach-Object {
            $name = $_.BaseName
            $Partials[$name] = Get-Content -Path $_.FullName -Raw -Encoding UTF8
        }
    }

    # Helper Generators for Dynamic Content
    function Safe-WriteAllText([string]$Path, [string]$Content) {
        $parent = Split-Path -Parent $Path
        if ($parent -and -not (Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        $written = $false
        for ($i = 0; $i -lt 5; $i++) {
            try {
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($Content)
                $fs = [System.IO.FileStream]::new(
                    $Path,
                    [System.IO.FileMode]::Create,
                    [System.IO.FileAccess]::Write,
                    [System.IO.FileShare]::ReadWrite
                )
                try {
                    $fs.Write($bytes, 0, $bytes.Length)
                    $written = $true
                    break
                } finally {
                    $fs.Dispose()
                }
            } catch {
                Start-Sleep -Milliseconds 50
            }
        }
        if (-not $written) {
            [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
        }
    }

    function Render-Nav([string]$PageIdentifier) {
        $items = @()
        $currentSlug = $PageIdentifier -replace '\.html$', ''
        if ($currentSlug -eq "index") { $currentSlug = "" }

        foreach ($link in $Data.site.nav) {
            $linkSlug = $link.href.TrimStart('/').TrimEnd('/')
            if ($linkSlug -eq "index") { $linkSlug = "" }

            $isCurrent = ""
            if ($linkSlug -eq $currentSlug) {
                $isCurrent = ' aria-current="page"'
            }
            $charCount = $link.label.Length
            $letters = ""
            for ($i = 0; $i -lt $charCount; $i++) {
                $ch = $link.label[$i]
                $chText = if ($ch -eq " ") { "&nbsp;" } else { [string]$ch }
                $letters += "<span class=`"nav-char`" style=`"--char-index: $i; --total-chars: $charCount;`">$chText</span>"
            }
            $items += "<li><a href=`"$($link.href)`" class=`"nav-link`"$isCurrent aria-label=`"$($link.label)`"><span class=`"nav-chars-wrapper`" aria-hidden=`"true`">$letters</span><span class=`"visually-hidden`">$($link.label)</span></a></li>"
        }
        return ($items -join "`n        ")
    }

    function Render-ProjectCard($p) {
        $targetUrl = if ($p.liveUrl) { $p.liveUrl } elseif ($p.repoUrl) { $p.repoUrl } else { "#" }
        return @"
        <article class="project-item" id="$($p.id)">
          <h3 class="project-title">
            <a href="$targetUrl" class="project-title-link" target="_blank" rel="noopener noreferrer">
              $($p.title)
            </a>
          </h3>
          <p class="project-desc">
            <a href="$targetUrl" class="project-desc-link" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
              $($p.description)&nbsp;<span class="project-arrow-wrap" aria-hidden="true"><svg class="project-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>
            </a>
          </p>
        </article>
"@
    }

    function Render-Projects([bool]$FeaturedOnly) {
        $cards = @()
        $list = if ($FeaturedOnly) {
            $Data.projects | Where-Object { $_.featured -eq $true } | Sort-Object { if ($_.featuredOrder) { [int]$_.featuredOrder } else { 99 } }
        } else {
            $Data.projects
        }
        foreach ($p in $list) {
            $cards += Render-ProjectCard $p
        }
        return ($cards -join "`n")
    }

    function Format-RubberLetters($text) {
        if (-not $text) { return "" }
        $lines = $text -split "\r?\n"
        $letterIdx = 0
        $formattedLines = foreach ($line in $lines) {
            $words = ($line.Trim() -split '\s+') | Where-Object { $_ -ne "" }
            $wordSpans = foreach ($word in $words) {
                $chars = $word.ToCharArray()
                $letters = foreach ($ch in $chars) {
                    $delay = $letterIdx * 20
                    $letterIdx++
                    "<span class=`"rubber-letter`" style=`"--rubber-delay: ${delay}ms;`">$ch</span>"
                }
                "<span class=`"rubber-word`">$($letters -join '')</span>"
            }
            $wordSpans -join '<span class="rubber-space">&nbsp;</span>'
        }
        return ($formattedLines -join '<br class="rubber-break">')
    }

    function Render-AboutProse {
        if (-not $Data.about -or -not $Data.about.paragraphs) { return "" }
        $paras = foreach ($p in $Data.about.paragraphs) {
            "<p>$p</p>"
        }
        return ($paras -join "`n          ")
    }

    function Render-Experience {
        if (-not $Data.experience) { return "" }
        $items = @()
        $idx = 0
        foreach ($exp in $Data.experience) {
            $isAct = if ($idx -eq 0) { " is-active" } else { "" }
            $roleFormatted = Format-RubberLetters $exp.role
            $cleanRole = ($exp.role -replace "\r?\n\s*", " ").Trim()
            $descHtml = if ($exp.description) {
                $descWithBr = $exp.description -replace "\r?\n", "<br>"
                "<p class=`"experience-desc`">$descWithBr</p>"
            } else { "" }
            $items += @"
        <article class="experience-float-item$isAct" data-index="$idx" data-year="$($exp.period)" aria-label="$cleanRole at $($exp.company) ($($exp.period))">
          <div class="experience-meta-mobile">
            <span class="experience-period">$($exp.period)</span>
          </div>
          <h3 class="experience-role rubber-title">
            <span class="experience-role-text">$roleFormatted</span>
          </h3>
          <div class="experience-company">$($exp.company)</div>
          $descHtml
        </article>
"@
            $idx++
        }
        return ($items -join "`n")
    }

    function Render-Schema([string]$PageBase) {
        if ($PageBase -eq "404") {
            return "<!-- JSON-LD suppressed on error page to avoid search index pollution -->"
        }

        $siteUrl = $Data.site.url.TrimEnd('/')
        $allSkills = @()
        if ($Data.skills) {
            foreach ($s in $Data.skills) {
                foreach ($it in $s.items) {
                    $allSkills += $it
                }
            }
        }

        $socialLinks = @()
        if ($Data.site.github) { $socialLinks += $Data.site.github }
        if ($Data.site.linkedin) { $socialLinks += $Data.site.linkedin }
        if ($Data.site.instagram) { $socialLinks += $Data.site.instagram }

        $personEntity = [ordered]@{
            "@type" = "Person"
            "@id" = "$siteUrl/#person"
            "name" = [string]$Data.site.fullName
            "alternateName" = [string]$Data.site.nickname
            "url" = $siteUrl
            "jobTitle" = [string]$Data.hero.role
            "sameAs" = @($socialLinks)
            "knowsAbout" = @($allSkills)
        }

        $webSiteEntity = [ordered]@{
            "@type" = "WebSite"
            "@id" = "$siteUrl/#website"
            "url" = $siteUrl
            "name" = [string]$Data.site.title
            "publisher" = [ordered]@{ "@id" = "$siteUrl/#person" }
            "inLanguage" = "en-US"
        }

        $graph = [System.Collections.ArrayList]::new()

        if ($PageBase -eq "index") {
            $pTitle = if ($PageMeta.ContainsKey("index.html")) { $PageMeta["index.html"].title } else { $Data.site.title }
            $pDesc = if ($PageMeta.ContainsKey("index.html")) { $PageMeta["index.html"].description } else { $Data.site.description }
            $profilePage = [ordered]@{
                "@type" = "ProfilePage"
                "@id" = "$siteUrl/#webpage"
                "url" = "$siteUrl/"
                "name" = $pTitle
                "description" = $pDesc
                "isPartOf" = [ordered]@{ "@id" = "$siteUrl/#website" }
                "mainEntity" = [ordered]@{ "@id" = "$siteUrl/#person" }
                "inLanguage" = "en-US"
            }
            [void]$graph.Add($webSiteEntity)
            [void]$graph.Add($profilePage)
            [void]$graph.Add($personEntity)
        }
        elseif ($PageBase -eq "about") {
            $pTitle = if ($PageMeta.ContainsKey("about.html")) { $PageMeta["about.html"].title } else { "About $($Data.site.fullName)" }
            $pDesc = if ($PageMeta.ContainsKey("about.html")) { $PageMeta["about.html"].description } else { $Data.site.description }
            $aboutPage = [ordered]@{
                "@type" = "AboutPage"
                "@id" = "$siteUrl/about#webpage"
                "url" = "$siteUrl/about"
                "name" = $pTitle
                "description" = $pDesc
                "isPartOf" = [ordered]@{ "@id" = "$siteUrl/#website" }
                "mainEntity" = [ordered]@{ "@id" = "$siteUrl/#person" }
                "breadcrumb" = [ordered]@{ "@id" = "$siteUrl/about#breadcrumb" }
                "inLanguage" = "en-US"
            }
            $breadcrumb = [ordered]@{
                "@type" = "BreadcrumbList"
                "@id" = "$siteUrl/about#breadcrumb"
                "itemListElement" = @(
                    [ordered]@{ "@type" = "ListItem"; "position" = 1; "name" = "Home"; "item" = "$siteUrl/" },
                    [ordered]@{ "@type" = "ListItem"; "position" = 2; "name" = "About"; "item" = "$siteUrl/about" }
                )
            }
            [void]$graph.Add($webSiteEntity)
            [void]$graph.Add($aboutPage)
            [void]$graph.Add($breadcrumb)
            [void]$graph.Add($personEntity)
        }
        elseif ($PageBase -eq "projects") {
            $pTitle = if ($PageMeta.ContainsKey("projects.html")) { $PageMeta["projects.html"].title } else { "Engineering Projects" }
            $pDesc = if ($PageMeta.ContainsKey("projects.html")) { $PageMeta["projects.html"].description } else { $Data.site.description }
            $collectionPage = [ordered]@{
                "@type" = "CollectionPage"
                "@id" = "$siteUrl/projects#webpage"
                "url" = "$siteUrl/projects"
                "name" = $pTitle
                "description" = $pDesc
                "isPartOf" = [ordered]@{ "@id" = "$siteUrl/#website" }
                "mainEntity" = [ordered]@{ "@id" = "$siteUrl/projects#itemlist" }
                "breadcrumb" = [ordered]@{ "@id" = "$siteUrl/projects#breadcrumb" }
                "inLanguage" = "en-US"
            }
            $breadcrumb = [ordered]@{
                "@type" = "BreadcrumbList"
                "@id" = "$siteUrl/projects#breadcrumb"
                "itemListElement" = @(
                    [ordered]@{ "@type" = "ListItem"; "position" = 1; "name" = "Home"; "item" = "$siteUrl/" },
                    [ordered]@{ "@type" = "ListItem"; "position" = 2; "name" = "Projects"; "item" = "$siteUrl/projects" }
                )
            }
            $projItems = @()
            $pos = 1
            foreach ($p in $Data.projects) {
                $appUrl = if ($p.liveUrl) { $p.liveUrl } else { "$siteUrl/projects" }
                $appObj = [ordered]@{
                    "@type" = "SoftwareApplication"
                    "@id" = "$siteUrl/projects#$($p.id)"
                    "name" = [string]$p.title
                    "description" = [string]$p.description
                    "applicationCategory" = "GameEngine|SystemsSoftware"
                    "operatingSystem" = "All"
                    "url" = $appUrl
                }
                if ($p.repoUrl) { $appObj["codeRepository"] = [string]$p.repoUrl }
                $appObj["author"] = [ordered]@{ "@id" = "$siteUrl/#person" }

                $projItems += [ordered]@{
                    "@type" = "ListItem"
                    "position" = $pos
                    "item" = $appObj
                }
                $pos++
            }
            $itemList = [ordered]@{
                "@type" = "ItemList"
                "@id" = "$siteUrl/projects#itemlist"
                "name" = if ($Data.projectsSection -and $Data.projectsSection.title) { [string]$Data.projectsSection.title } else { "Works & Projects" }
                "description" = $pDesc
                "numberOfItems" = $projItems.Count
                "itemListElement" = @($projItems)
            }
            [void]$graph.Add($webSiteEntity)
            [void]$graph.Add($collectionPage)
            [void]$graph.Add($itemList)
            [void]$graph.Add($breadcrumb)
            [void]$graph.Add($personEntity)
        }
        elseif ($PageBase -eq "contact") {
            $pTitle = if ($PageMeta.ContainsKey("contact.html")) { $PageMeta["contact.html"].title } else { "Contact" }
            $pDesc = if ($PageMeta.ContainsKey("contact.html")) { $PageMeta["contact.html"].description } else { $Data.site.description }
            $contactPage = [ordered]@{
                "@type" = "ContactPage"
                "@id" = "$siteUrl/contact#webpage"
                "url" = "$siteUrl/contact"
                "name" = $pTitle
                "description" = $pDesc
                "isPartOf" = [ordered]@{ "@id" = "$siteUrl/#website" }
                "mainEntity" = [ordered]@{ "@id" = "$siteUrl/#person" }
                "breadcrumb" = [ordered]@{ "@id" = "$siteUrl/contact#breadcrumb" }
                "inLanguage" = "en-US"
            }
            $breadcrumb = [ordered]@{
                "@type" = "BreadcrumbList"
                "@id" = "$siteUrl/contact#breadcrumb"
                "itemListElement" = @(
                    [ordered]@{ "@type" = "ListItem"; "position" = 1; "name" = "Home"; "item" = "$siteUrl/" },
                    [ordered]@{ "@type" = "ListItem"; "position" = 2; "name" = "Contact"; "item" = "$siteUrl/contact" }
                )
            }
            $contactPerson = [ordered]@{
                "@type" = "Person"
                "@id" = "$siteUrl/#person"
                "name" = [string]$Data.site.fullName
                "alternateName" = [string]$Data.site.nickname
                "url" = $siteUrl
                "jobTitle" = [string]$Data.hero.role
                "email" = "mailto:$($Data.site.email)"
                "sameAs" = @($socialLinks)
                "knowsAbout" = @($allSkills)
            }
            [void]$graph.Add($webSiteEntity)
            [void]$graph.Add($contactPage)
            [void]$graph.Add($breadcrumb)
            [void]$graph.Add($contactPerson)
        }

        $jsonLdObj = [ordered]@{
            "@context" = "https://schema.org"
            "@graph" = @($graph)
        }

        $jsonStr = $jsonLdObj | ConvertTo-Json -Depth 10
        return "<script type=`"application/ld+json`">`n$jsonStr`n</script>"
    }

    # 5. Compile Pages
    $PagesDir = Join-Path $SrcDir "pages"
    $PageList = @()

    if (Test-Path $PagesDir) {
        $HtmlFiles = Get-ChildItem -Path $PagesDir -Filter "*.html"
        foreach ($file in $HtmlFiles) {
            $PageName = $file.Name
            $PageBase = $file.BaseName
            $PageList += $PageName

            $Content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

            # Replace Partials: {{> partial_name}}
            foreach ($pName in $Partials.Keys) {
                $needle = "{{> $pName}}"
                $Content = $Content.Replace($needle, $Partials[$pName])
            }

            # Inject Computed Helpers
            $Content = $Content.Replace("{{nav_links}}", (Render-Nav $PageName))
            $Content = $Content.Replace("{{featured_projects}}", (Render-Projects $true))
            $Content = $Content.Replace("{{all_projects}}", (Render-Projects $false))
            $Content = $Content.Replace("{{experience_timeline}}", (Render-Experience))

            # Replace Page-Specific Metadata
            $pTitle = $Data.site.title
            $pDesc = $Data.site.description
            $pCanonical = "$($Data.site.url)/$PageName"
            $pRobots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"

            if ($PageMeta.ContainsKey($PageName)) {
                $pTitle = $PageMeta[$PageName].title
                $pDesc = $PageMeta[$PageName].description
                $pCanonical = $PageMeta[$PageName].canonical
                if ($PageMeta[$PageName].ContainsKey("robots")) {
                    $pRobots = $PageMeta[$PageName].robots
                }
            }

            $Content = $Content.Replace("{{page.title}}", $pTitle)
            $Content = $Content.Replace("{{page.description}}", $pDesc)
            $Content = $Content.Replace("{{page.canonicalUrl}}", $pCanonical)
            $Content = $Content.Replace("{{page.robots}}", $pRobots)

            # Conditional canonical tag (omitted on 404)
            $canonicalTag = if ($pCanonical) { "<link rel=`"canonical`" href=`"$pCanonical`">" } else { "<!-- canonical omitted for error page -->" }
            $Content = $Content.Replace("{{canonical_tag}}", $canonicalTag)

            # Open Graph & Twitter URL Tags (omitted on 404)
            $ogUrlTag = if ($pCanonical) { "<meta property=`"og:url`" content=`"$pCanonical`">" } else { "<!-- og:url omitted for error page -->" }
            $Content = $Content.Replace("{{og_url_tag}}", $ogUrlTag)

            $twitterUrlTag = if ($pCanonical) { "<meta name=`"twitter:url`" content=`"$pCanonical`">" } else { "<!-- twitter:url omitted for error page -->" }
            $Content = $Content.Replace("{{twitter_url_tag}}", $twitterUrlTag)

            # Inject Unified Schema Markup
            $Content = $Content.Replace("{{schema_markup}}", (Render-Schema $PageBase))
            $Content = $Content.Replace("{{breadcrumb_jsonld}}", "")

            # Replace Global Site Variables
            $Content = $Content.Replace("{{site.name}}", $Data.site.name)
            $Content = $Content.Replace("{{site.fullName}}", $Data.site.fullName)
            $Content = $Content.Replace("{{site.nickname}}", $Data.site.nickname)
            $Content = $Content.Replace("{{site.title}}", $Data.site.title)
            $Content = $Content.Replace("{{site.description}}", $Data.site.description)
            $Content = $Content.Replace("{{site.url}}", $Data.site.url)
            $Content = $Content.Replace("{{site.author}}", $Data.site.author)
            $Content = $Content.Replace("{{site.email}}", $Data.site.email)
            $Content = $Content.Replace("{{site.twitter}}", $Data.site.twitter)
            $Content = $Content.Replace("{{site.github}}", [string]$Data.site.github)
            $Content = $Content.Replace("{{site.linkedin}}", [string]$Data.site.linkedin)
            $Content = $Content.Replace("{{site.instagram}}", [string]$Data.site.instagram)
            $Content = $Content.Replace("{{site.themeColor}}", [string]$Data.site.themeColor)
            $themeDark = if ($Data.site.themeColorDark) { [string]$Data.site.themeColorDark } else { "#1C1714" }
            $Content = $Content.Replace("{{site.themeColorDark}}", $themeDark)
            $locale = if ($Data.site.locale) { [string]$Data.site.locale } else { "en_US" }
            $Content = $Content.Replace("{{site.locale}}", $locale)
            $Content = $Content.Replace("{{site.currentYear}}", (Get-Date).Year.ToString())

            # Formatted Handles
            $githubHandle = if ($Data.site.github) { ($Data.site.github -replace '^https?://github\.com/', 'github.com/').TrimEnd('/') } else { '' }
            $Content = $Content.Replace("{{site.githubDisplay}}", $githubHandle)
            $linkedinHandle = if ($Data.site.linkedin) { ($Data.site.linkedin -replace '^https?://(www\.)?linkedin\.com/in/', 'linkedin.com/in/').TrimEnd('/') } else { '' }
            $Content = $Content.Replace("{{site.linkedinDisplay}}", $linkedinHandle)
            $instagramHandle = if ($Data.site.instagram) { ($Data.site.instagram -replace '^https?://(www\.)?instagram\.com/', 'instagram.com/').TrimEnd('/') } else { '' }
            $Content = $Content.Replace("{{site.instagramDisplay}}", $instagramHandle)

            # Replace Hero Variables
            $heroTagline = if ($Data.hero.tagline) { $Data.hero.tagline -replace "\r?\n", "<br>" } else { "" }
            $heroRole = [string]$Data.hero.role
            $cleanHeroRole = $heroRole -replace '\r?\n\s*', ' '
            $Content = $Content.Replace("{{hero.role}}", $cleanHeroRole)
            $Content = $Content.Replace("{{hero_role_letters}}", (Format-RubberLetters $heroRole))
            $Content = $Content.Replace("{{hero.tagline}}", $heroTagline)

            $ctaPriLabel = if ($Data.hero.ctaPrimary -and $Data.hero.ctaPrimary.label) { [string]$Data.hero.ctaPrimary.label } else { "Explore projects" }
            $ctaPriHref = if ($Data.hero.ctaPrimary -and $Data.hero.ctaPrimary.href) { [string]$Data.hero.ctaPrimary.href } else { "/projects" }
            $ctaSecLabel = if ($Data.hero.ctaSecondary -and $Data.hero.ctaSecondary.label) { [string]$Data.hero.ctaSecondary.label } else { "Let's connect" }
            $ctaSecHref = if ($Data.hero.ctaSecondary -and $Data.hero.ctaSecondary.href) { [string]$Data.hero.ctaSecondary.href } else { "/contact" }

            $Content = $Content.Replace("{{hero.ctaPrimary.label}}", $ctaPriLabel)
            $Content = $Content.Replace("{{hero.ctaPrimary.href}}", $ctaPriHref)
            $Content = $Content.Replace("{{hero.ctaSecondary.label}}", $ctaSecLabel)
            $Content = $Content.Replace("{{hero.ctaSecondary.href}}", $ctaSecHref)

            # Section Variables & Helpers
            $projTitle = if ($Data.projectsSection -and $Data.projectsSection.title) { [string]$Data.projectsSection.title } else { "Works & Projects" }
            $Content = $Content.Replace("{{projects.title}}", $projTitle)
            $Content = $Content.Replace("{{projects_title_letters}}", (Format-RubberLetters $projTitle))

            $expTitle = if ($Data.experienceSection -and $Data.experienceSection.title) { [string]$Data.experienceSection.title } else { "My Experience" }
            $expSub = if ($Data.experienceSection -and $Data.experienceSection.subtitle) { [string]$Data.experienceSection.subtitle } else { "" }
            $Content = $Content.Replace("{{experience.title}}", $expTitle)
            $Content = $Content.Replace("{{experience.subtitle}}", $expSub)

            $aboutTitle = if ($Data.about -and $Data.about.title) { [string]$Data.about.title } else { [string]$Data.site.fullName }
            $Content = $Content.Replace("{{about.title}}", $aboutTitle)
            $Content = $Content.Replace("{{about_title_letters}}", (Format-RubberLetters $aboutTitle))
            $Content = $Content.Replace("{{about_prose}}", (Render-AboutProse))

            # Contact Variables
            $contactTitle = if ($Data.contact -and $Data.contact.title) { [string]$Data.contact.title } else { "Let's connect" }
            $Content = $Content.Replace("{{contact.title}}", $contactTitle)
            $Content = $Content.Replace("{{contact_title_letters}}", (Format-RubberLetters $contactTitle))
            if ($Data.contact) {
                $sub = if ($Data.contact.subtitle) { [string]$Data.contact.subtitle } else { "" }
                $Content = $Content.Replace("{{contact.subtitle}}", $sub)
                $Content = $Content.Replace("{{contact.formTitle}}", [string]$Data.contact.formTitle)
                $Content = $Content.Replace("{{contact.formButton}}", [string]$Data.contact.formButton)
            }

            # JSON-LD Skills Knowledge List
            $allSkills = @()
            if ($Data.skills) {
                foreach ($s in $Data.skills) {
                    foreach ($it in $s.items) {
                        $allSkills += $it
                    }
                }
            }
            $allSkillsJson = $allSkills | ConvertTo-Json -Compress
            $Content = $Content.Replace("{{knows_about_json}}", $allSkillsJson)

            # Output to dist/ (dist/<page>.html)
            $DestPath = Join-Path $DistDir $PageName
            Safe-WriteAllText $DestPath $Content

            # Clean URL Directory Output (e.g., dist/about/index.html)
            if ($PageBase -ne "index" -and $PageBase -ne "404") {
                $SubDir = Join-Path $DistDir $PageBase
                $SubIndexPath = Join-Path $SubDir "index.html"
                Safe-WriteAllText $SubIndexPath $Content
            }

            # Mirror to Workspace Root for Live Server & Local Preview
            if ($PageBase -eq "index") {
                Safe-WriteAllText (Join-Path $ScriptDir "index.html") $Content
            } elseif ($PageBase -eq "404") {
                Safe-WriteAllText (Join-Path $ScriptDir "404.html") $Content
            } else {
                # Mirror both root/<pageBase>.html AND root/<pageBase>/index.html
                Safe-WriteAllText (Join-Path $ScriptDir "$PageBase.html") $Content
                $RootSubDir = Join-Path $ScriptDir $PageBase
                Safe-WriteAllText (Join-Path $RootSubDir "index.html") $Content
            }

            if ($PageBase -ne "index" -and $PageBase -ne "404") {
                Write-Host " [HTML] Compiled: dist/$PageName & dist/$PageBase/index.html (mirrored to root)" -ForegroundColor Green
            } else {
                Write-Host " [HTML] Compiled: dist/$PageName (mirrored to root)" -ForegroundColor Green
            }
        }
    }

    # 6. Generate sitemap.xml with Clean URLs
    $TodayDate = (Get-Date).ToString("yyyy-MM-dd")
    $SitemapPages = @("index.html") + ($PageList | Where-Object { $_ -ne "404.html" -and $_ -ne "index.html" } | Sort-Object)
    $SitemapEntries = @()
    foreach ($p in $SitemapPages) {
        $slug = $p -replace '\.html$', ''
        if ($slug -eq "index") {
            $priority = "1.0"
            $pageUrl = "$($Data.site.url)/"
        } else {
            $priority = "0.8"
            $pageUrl = "$($Data.site.url)/$slug"
        }

        $SitemapEntries += @"
  <url>
    <loc>$pageUrl</loc>
    <lastmod>$TodayDate</lastmod>
    <changefreq>monthly</changefreq>
    <priority>$priority</priority>
  </url>
"@
    }

    $SitemapXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$($SitemapEntries -join "`n")
</urlset>
"@.Trim()

    $SitemapPath = Join-Path $DistDir "sitemap.xml"
    [System.IO.File]::WriteAllText($SitemapPath, $SitemapXml, [System.Text.Encoding]::UTF8)
    $RootSitemapPath = Join-Path $ScriptDir "sitemap.xml"
    [System.IO.File]::WriteAllText($RootSitemapPath, $SitemapXml, [System.Text.Encoding]::UTF8)
    Write-Host " [SEO] Generated: dist/sitemap.xml (mirrored to root)" -ForegroundColor Green

    # 7. Generate robots.txt
    $RobotsTxt = @"
# Modern AI Crawlers
User-agent: GPTBot
Allow: /
Disallow: /draw.html
Disallow: /tools/

User-agent: PerplexityBot
Allow: /
Disallow: /draw.html
Disallow: /tools/

User-agent: ClaudeBot
Allow: /
Disallow: /draw.html
Disallow: /tools/

# General Web Crawlers
User-agent: *
Allow: /
Disallow: /draw.html
Disallow: /tools/

Sitemap: $($Data.site.url)/sitemap.xml
"@.Trim()

    $RobotsPath = Join-Path $DistDir "robots.txt"
    [System.IO.File]::WriteAllText($RobotsPath, $RobotsTxt, [System.Text.Encoding]::UTF8)
    $RootRobotsPath = Join-Path $ScriptDir "robots.txt"
    [System.IO.File]::WriteAllText($RootRobotsPath, $RobotsTxt, [System.Text.Encoding]::UTF8)
    Write-Host " [SEO] Generated: dist/robots.txt (mirrored to root)" -ForegroundColor Green

    # Mirror llms.txt for AI search crawlers
    $SrcLlms = Join-Path $SrcDir "llms.txt"
    if (Test-Path $SrcLlms) {
        $LlmsContent = [System.IO.File]::ReadAllText($SrcLlms, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText((Join-Path $DistDir "llms.txt"), $LlmsContent, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText((Join-Path $ScriptDir "llms.txt"), $LlmsContent, [System.Text.Encoding]::UTF8)
        Write-Host " [AI] Mirrored: src/llms.txt -> dist/llms.txt & root llms.txt" -ForegroundColor Green
    }

    # 8. Generate Static Server Redirect Rules (_redirects & vercel.json)
    $RedirectsContent = @"
/index.html   /   301!
/about.html   /about   301!
/projects.html   /projects   301!
/contact.html   /contact   301!
"@.Trim()
    [System.IO.File]::WriteAllText((Join-Path $DistDir "_redirects"), $RedirectsContent, [System.Text.Encoding]::UTF8)

    $VercelConfig = @"
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    { "source": "/index.html", "destination": "/", "permanent": true },
    { "source": "/about.html", "destination": "/about", "permanent": true },
    { "source": "/projects.html", "destination": "/projects", "permanent": true },
    { "source": "/contact.html", "destination": "/contact", "permanent": true }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
"@.Trim()
    [System.IO.File]::WriteAllText((Join-Path $DistDir "vercel.json"), $VercelConfig, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $ScriptDir "vercel.json"), $VercelConfig, [System.Text.Encoding]::UTF8)
    Write-Host " [Rules] Generated: dist/_redirects & dist/vercel.json (mirrored to root)" -ForegroundColor Green

    # 9. Copy Assets & Scripts to dist/ AND Root Workspace (for Live Server)
    $SrcAssets = Join-Path $SrcDir "assets"
    if (Test-Path $SrcAssets) {
        Copy-Item -Path "$SrcAssets\*" -Destination $AssetsDistDir -Recurse -Force -ErrorAction SilentlyContinue
        $RootAssets = Join-Path $ScriptDir "assets"
        if (-not (Test-Path $RootAssets)) { New-Item -ItemType Directory -Path $RootAssets -Force | Out-Null }
        Copy-Item -Path "$SrcAssets\*" -Destination $RootAssets -Recurse -Force -ErrorAction SilentlyContinue
    }

    $SrcJs = Join-Path $SrcDir "js"
    if (Test-Path $SrcJs) {
        Copy-Item -Path "$SrcJs\*" -Destination $JsDistDir -Recurse -Force -ErrorAction SilentlyContinue
        $RootJs = Join-Path $ScriptDir "js"
        if (-not (Test-Path $RootJs)) { New-Item -ItemType Directory -Path $RootJs -Force | Out-Null }
        Copy-Item -Path "$SrcJs\*" -Destination $RootJs -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host " [JS] Copied: dist/js & root js/" -ForegroundColor Green
    }

    # Copy minified CSS to Root Workspace
    $RootCssDir = Join-Path $ScriptDir "css"
    if (-not (Test-Path $RootCssDir)) { New-Item -ItemType Directory -Path $RootCssDir -Force | Out-Null }
    Copy-Item -Path $OutputCssPath -Destination (Join-Path $RootCssDir "style.css") -Force -ErrorAction SilentlyContinue


    # 10. Strict Verification: Check ALL output HTML files for unreplaced template tags
    $TokenRegex = '\{\{[a-zA-Z0-9_\.\>\s]+?\}\}'
    $ErrorsFound = @()
    Get-ChildItem -Path $DistDir -Filter "*.html" -Recurse | ForEach-Object {
        $txt = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        $m = [regex]::Matches($txt, $TokenRegex)
        if ($m.Count -gt 0) {
            $bad = ($m | ForEach-Object { $_.Value } | Select-Object -Unique) -join ', '
            $ErrorsFound += "$($_.Name): $bad"
        }
    }
    $RootHtmls = @("index.html", "about.html", "projects.html", "contact.html", "404.html")
    foreach ($rFile in $RootHtmls) {
        $rPath = Join-Path $ScriptDir $rFile
        if (Test-Path $rPath) {
            $txt = [System.IO.File]::ReadAllText($rPath, [System.Text.Encoding]::UTF8)
            $m = [regex]::Matches($txt, $TokenRegex)
            if ($m.Count -gt 0) {
                $bad = ($m | ForEach-Object { $_.Value } | Select-Object -Unique) -join ', '
                $ErrorsFound += "root/${rFile}: $bad"
            }
        }
    }
    if ($ErrorsFound.Count -gt 0) {
        Write-Error "CRITICAL BUILD FAILURE: Unreplaced template tokens detected in output files:`n$($ErrorsFound -join "`n")"
        return
    }
    Write-Host " [Verify] Zero unreplaced template tokens confirmed across all builds." -ForegroundColor Green

    $Duration = ((Get-Date) - $StartTime).TotalMilliseconds
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host (" [Done] Compilation completed in {0:N0} ms" -f $Duration) -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
}

# Run Build
Build-Site

# Optional Watch Mode
if ($Watch) {
    Write-Host "`n==========================================" -ForegroundColor Yellow
    Write-Host " [Watcher] Active: Monitoring src/ and data/..." -ForegroundColor Yellow
    Write-Host " Edit any HTML, CSS, JSON, or SVG file to rebuild automatically." -ForegroundColor Gray
    Write-Host " Press Ctrl+C in this terminal to stop watching." -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Yellow

    function Get-WatchSnapshot {
        $snapshot = @{}
        Get-ChildItem -Path $SrcDir, $DataDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            $snapshot[$_.FullName] = $_.LastWriteTimeUtc.Ticks
        }
        return $snapshot
    }

    $lastSnapshot = Get-WatchSnapshot

    while ($true) {
        Start-Sleep -Milliseconds 350

        $currentSnapshot = Get-WatchSnapshot
        $changed = $false
        $changedFile = ""

        # Check modifications and deletions
        foreach ($p in $lastSnapshot.Keys) {
            if (-not $currentSnapshot.ContainsKey($p)) {
                $changed = $true
                $changedFile = Split-Path -Leaf $p
                break
            } elseif ($currentSnapshot[$p] -ne $lastSnapshot[$p]) {
                $changed = $true
                $changedFile = Split-Path -Leaf $p
                break
            }
        }

        # Check additions
        if (-not $changed) {
            foreach ($p in $currentSnapshot.Keys) {
                if (-not $lastSnapshot.ContainsKey($p)) {
                    $changed = $true
                    $changedFile = Split-Path -Leaf $p
                    break
                }
            }
        }

        if ($changed) {
            Start-Sleep -Milliseconds 120 # Debounce editor write flush
            $time = Get-Date -Format "HH:mm:ss"
            Write-Host "`n[Watcher] Change detected in '$changedFile' at $time. Rebuilding..." -ForegroundColor Yellow
            try {
                Build-Site
            } catch {
                Write-Host " [Watcher Error] Build failed: $_" -ForegroundColor Red
            }
            $lastSnapshot = Get-WatchSnapshot
        }
    }
}
