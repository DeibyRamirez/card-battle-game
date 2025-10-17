"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface CardData {
    _id: string;
    nombre: string;
    imagen: string;
    atributos: {
        fuerza: number;
        velocidad: number;
        inteligencia: number;
        rareza: number;
    };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CardsPage() {
    const [cards, setCards] = useState<CardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const name = localStorage.getItem("playerName");
        if (!name) {
            router.push("/");
            return;
        }
        fetchCards();
    }, [router]);

    const fetchCards = async () => {
        try {
            const res = await fetch(`${API_URL}/api/cartas`);
            if (!res.ok) throw new Error("Error al obtener las cartas");
            const data = await res.json();
            setCards(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.push("/lobby")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Lobby
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight">Colección de Cartas</h1>
                        <p className="text-muted-foreground">Explora todas las cartas disponibles en el juego</p>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {cards.map((card) => (
                                <Card
                                    key={card._id}
                                    className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 overflow-hidden group"
                                >
                                    <CardContent className="p-0">
                                        <div className="aspect-[3/4] bg-gradient-to-br from-secondary to-secondary/50 relative overflow-hidden">
                                            {card.imagen ? (
                                                <img
                                                    src={
                                                        card.imagen.startsWith("http://localhost:3000")
                                                            ? card.imagen.replace("http://localhost:3000", "http://localhost:4000")
                                                            : card.imagen
                                                    }
                                                    alt={card.nombre}
                                                    className="w-full h-full object-cover"
                                                />


                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <p className="text-4xl font-bold text-muted-foreground/20">
                                                        {card.nombre.charAt(0)}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <h3 className="font-semibold text-sm truncate">{card.nombre}</h3>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {Object.entries(card.atributos).map(([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="flex justify-between p-1 bg-secondary/50 rounded"
                                                    >
                                                        <span className="text-muted-foreground capitalize">{key}:</span>
                                                        <span className="font-semibold text-primary">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
