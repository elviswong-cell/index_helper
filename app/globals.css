@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222 47% 5%;
    --foreground: 210 40% 98%;

    --card: 222 47% 8%;
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 8%;
    --popover-foreground: 210 40% 98%;

    --primary: 199 89% 60%;
    --primary-foreground: 222 47% 5%;

    --secondary: 217 32% 17%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217 32% 14%;
    --muted-foreground: 215 20% 65%;

    --accent: 199 89% 60%;
    --accent-foreground: 222 47% 5%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;

    --success: 142 71% 45%;
    --success-foreground: 222 47% 5%;

    --warning: 38 92% 50%;
    --warning-foreground: 222 47% 5%;

    --border: 217 32% 20%;
    --input: 217 32% 17%;
    --ring: 199 89% 60%;

    --radius: 0.625rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  html,
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings:
      "rlig" 1,
      "calt" 1;
  }
  body {
    background-image:
      radial-gradient(
        ellipse 80% 50% at 50% -20%,
        hsl(var(--primary) / 0.15),
        transparent
      ),
      linear-gradient(
        to right,
        hsl(var(--border) / 0.3) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px);
    background-size:
      100% 100%,
      48px 48px,
      48px 48px;
    background-position:
      0 0,
      0 0,
      0 0;
    min-height: 100vh;
  }
}

@layer components {
  .glass {
    @apply bg-card/60 backdrop-blur-xl border border-border/60;
  }
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500;
  }
  .hover-glow {
    @apply transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] hover:border-primary/50;
  }
}
