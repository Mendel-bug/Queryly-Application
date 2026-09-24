import React from "react";
import { Github } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function ShareGitHub() {
  const { toast } = useToast();

  function share() {
    const url = window.location.origin;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    toast({
      title: "App link copied to clipboard",
      description: "Paste it into a GitHub gist or repo README to share Queryly.",
    });
    window.open("https://gist.github.com/", "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="outline" size="sm" onClick={share} className="gap-2">
      <Github className="h-4 w-4" /> Share on GitHub
    </Button>
  );
}