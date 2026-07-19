<!DOCTYPE html>
<html lang="ar" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" href="data:,">
        @unless (app()->environment('local'))
        <link rel="manifest" href="/build/manifest.webmanifest">
        <meta name="theme-color" content="#0f766e">
        <meta name="mobile-web-app-capable" content="yes">
        <link rel="apple-touch-icon" href="/pwa-icon.svg">
        @endunless
        <title>Gate</title>

        <!-- Fonts -->
        
    
  
    @vite(['src/app.js', 'src/styles/app.css'])


  </head>
    <body class="bg-neutral-100">
       <div id="app">
       
       </div>
    </body>
</html>
