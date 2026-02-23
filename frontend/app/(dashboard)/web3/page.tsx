"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Shield, FileText, Coins, Link2 } from "lucide-react";

export default function Web3Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Web3 / Blockchain
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Descentralización, consentimiento verificable e IPFS para analytics de clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Consent Registry (SSI/DID)
            </CardTitle>
            <Badge variant="secondary">On-chain</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Registro de consentimiento del usuario (data_share, marketing, analytics) con
              soporte para Verifiable Credentials y DIDs. Los registros se persisten en
              base de datos con referencia opcional a credenciales verificables.
            </p>
            <Link
              href="/consent"
              className="text-sm font-medium text-primary hover:underline"
            >
              Gestionar consentimientos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              IPFS Storage
            </CardTitle>
            <Badge variant="secondary">Descentralizado</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Sube reportes y artefactos a IPFS para almacenamiento inmutable y
              descentralizado. Cada subida devuelve un CID que puede usarse como
              referencia permanente.
            </p>
            <Link
              href="/reports"
              className="text-sm font-medium text-primary hover:underline"
            >
              Generar reporte con IPFS →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              Token Rewards
            </CardTitle>
            <Badge variant="outline">Phase 2</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Modelo de recompensas por acciones (data_share, consent_granted). Preparado
              para integración con Polygon/Solana. Los usuarios pueden ganar tokens por
              compartir datos de forma verificable.
            </p>
            <span className="text-sm text-muted-foreground">Próximamente</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="size-5 text-primary" />
              Verifiable Credentials
            </CardTitle>
            <Badge variant="outline">SSI</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Soporte para credenciales verificables (DIDs, W3C). Los consentimientos
              pueden asociarse a un verifiable_credential_id para trazabilidad on-chain.
            </p>
            <span className="text-sm text-muted-foreground">Integrado en Consent</span>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">
            <strong>Enfoque Web3:</strong> CohortLens combina analytics de CRM con
            blockchain y descentralización: consentimiento verificable, almacenamiento
            IPFS y modelo de tokens para incentivar el uso responsable de datos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
