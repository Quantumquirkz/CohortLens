"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Link2 } from "lucide-react";

export function Web3Card() {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          Web3 / Blockchain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Consentimiento verificable (SSI), IPFS para reportes y token rewards.
        </p>
        <Link
          href="/web3"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver módulo Web3 →
        </Link>
      </CardContent>
    </Card>
  );
}
