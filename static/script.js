
const form = document.getElementById("filtrationForm");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    // Récupération des données
    const d = {
        m0: Number(document.getElementById("m0").value),
        x0: Number(document.getElementById("x0").value),
        residus: Number(document.getElementById("residus").value),
        mR: Number(document.getElementById("mR").value),
        xR: Number(document.getElementById("xR").value),
        T2: Number(document.getElementById("T2").value),
        T3: Number(document.getElementById("T3").value),
        Cp: Number(document.getElementById("Cp").value),
        x4: Number(document.getElementById("x4").value),
        lambda_v: Number(document.getElementById("lambda_v").value),
        T4: Number(document.getElementById("T4").value),
        T5: Number(document.getElementById("T5").value)
    };

    try {
        // Vérification des données
        if (Object.values(d).some(v => !Number.isFinite(v))) {
            throw new Error("Veuillez remplir correctement tous les champs.");
        }

        if (d.m0 <= 0 || d.mR < 0) {
            throw new Error("Les débits sont invalides.");
        }

        if (d.residus < 0 || d.residus >= d.m0) {
            throw new Error("La quantité de résidus est invalide.");
        }

        if (
            d.x0 <= 0 || d.x0 > 100 ||
            d.xR < 0 || d.xR > 100 ||
            d.x4 <= 0 || d.x4 > 100
        ) {
            throw new Error("Les concentrations doivent être comprises entre 0 et 100 %.");
        }

        if (d.Cp <= 0 || d.lambda_v <= 0) {
            throw new Error("Les propriétés thermiques doivent être positives.");
        }

        if (d.T3 < d.T2 || d.T4 < d.T5) {
            throw new Error("Vérifiez les températures.");
        }

        // 1. FILTRATION
        const m1 = d.m0 - d.residus;
        const x1 = (d.m0 * d.x0) / m1;

        // 2. MÉLANGE
        const m2 = m1 + d.mR;
        const x2 = (m1 * x1 + d.mR * d.xR) / m2;

        // 3. CHAUFFAGE
        const Q3 = (m2 * d.Cp * (d.T3 - d.T2)) / 3600;

        // 4. ÉVAPORATION
        if (d.x4 < x2) {
            throw new Error("La concentration finale doit être supérieure ou égale à celle après mélange.");
        }

        const m4 = (m2 * x2) / d.x4;
        const mv = m2 - m4;
        const Q4 = (mv * d.lambda_v) / 3600;

        // 5. REFROIDISSEMENT
        const Q5 = (m4 * d.Cp * (d.T4 - d.T5)) / 3600;

        // Affichage des résultats
        document.getElementById("resultats").innerHTML = `
            <h2>Résultats de simulation</h2>

            <h3>1. Filtration</h3>
            <p>Débit après filtration : <strong>${m1.toFixed(2)} kg/h</strong></p>
            <p>Concentration après filtration : <strong>${x1.toFixed(2)} %</strong></p>

            <h3>2. Mélange</h3>
            <p>Débit après mélange : <strong>${m2.toFixed(2)} kg/h</strong></p>
            <p>Concentration après mélange : <strong>${x2.toFixed(2)} %</strong></p>

            <h3>3. Chauffage</h3>
            <p>Puissance thermique : <strong>${Q3.toFixed(2)} kW</strong></p>

            <h3>4. Évaporation</h3>
            <p>Débit de concentré : <strong>${m4.toFixed(2)} kg/h</strong></p>
            <p>Débit d'eau évaporée : <strong>${mv.toFixed(2)} kg/h</strong></p>
            <p>Puissance d'évaporation : <strong>${Q4.toFixed(2)} kW</strong></p>

            <h3>5. Refroidissement</h3>
            <p>Puissance de refroidissement : <strong>${Q5.toFixed(2)} kW</strong></p>
        `;

        // BILAN MASSIQUE GLOBAL
        const entrees = d.m0 + d.mR;
        const sorties = d.residus + mv + m4;
        const ecartM = Math.abs(entrees - sorties);

        document.getElementById("entreesTotales").textContent =
            entrees.toFixed(2) + " kg/h";

        document.getElementById("sortiesTotales").textContent =
            sorties.toFixed(2) + " kg/h";

        document.getElementById("ecartMassique").textContent =
            ecartM.toFixed(4) + " kg/h";

        document.getElementById("statutMassique").textContent =
            ecartM < 0.01
                ? "✓ Bilan massique équilibré"
                : "✗ Bilan massique non équilibré";

        document.getElementById("statutMassique").className =
            ecartM < 0.01 ? "bilan-ok" : "bilan-error";

        // BILAN DE MATIÈRE SOLUBLE
        const solubleEntree =
            (d.m0 * d.x0 / 100) + (d.mR * d.xR / 100);

        const solubleSortie = m4 * d.x4 / 100;

        const ecartS = Math.abs(solubleEntree - solubleSortie);

        document.getElementById("solubleEntrante").textContent =
            solubleEntree.toFixed(2) + " kg/h";

        document.getElementById("solubleSortante").textContent =
            solubleSortie.toFixed(2) + " kg/h";

        document.getElementById("ecartSoluble").textContent =
            ecartS.toFixed(4) + " kg/h";

        document.getElementById("statutSoluble").textContent =
            ecartS < 0.01
                ? "✓ Bilan de matière soluble équilibré"
                : "✗ Bilan de matière soluble non équilibré";

        document.getElementById("statutSoluble").className =
            ecartS < 0.01 ? "bilan-ok" : "bilan-error";

        // GRAPHIQUE 1 : DÉBIT D'EAU ÉVAPORÉE
        const concentrations = [];
        const debitsEvapores = [];

        for (let c = 40; c <= 50; c++) {
            const debitConcentre = (m2 * x2) / c;
            const debitEvapore = m2 - debitConcentre;

            concentrations.push(c + " %");
            debitsEvapores.push(Number(debitEvapore.toFixed(2)));
        }

        dessinerGraphique(
            "graphiqueEvaporation",
            concentrations,
            debitsEvapores,
            "Concentration finale (%)",
            "Débit d'eau évaporée (kg/h)"
        );

        // GRAPHIQUE 2 : PUISSANCE DE CHAUFFAGE
        const temperatures = [];
        const puissances = [];

        for (let T = 60; T <= 100; T += 5) {
            const Q = (m2 * d.Cp * (T - d.T2)) / 3600;

            temperatures.push(T + " °C");
            puissances.push(Number(Q.toFixed(2)));
        }

        dessinerGraphique(
            "graphiqueChauffage",
            temperatures,
            puissances,
            "Température T3 (°C)",
            "Puissance de chauffage (kW)"
        );

        // Afficher les résultats
        document.getElementById("resultats").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        alert(error.message);
    }
});


// FONCTION DE DESSIN DES GRAPHIQUES
function dessinerGraphique(id, etiquettes, valeurs, titreX, titreY) {

    const canvas = document.getElementById(id);

    if (!canvas || valeurs.length === 0) return;

    const ctx = canvas.getContext("2d");

    const largeur = canvas.clientWidth || 800;
    const hauteur = 350;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = largeur * ratio;
    canvas.height = hauteur * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const gauche = 65;
    const droite = 20;
    const haut = 25;
    const bas = 60;

    const largeurZone = largeur - gauche - droite;
    const hauteurZone = hauteur - haut - bas;

    let minY = Math.min(...valeurs);
    let maxY = Math.max(...valeurs);

    if (minY === maxY) {
        maxY += 1;
        minY -= 1;
    }

    const marge = (maxY - minY) * 0.12;
    minY = Math.max(0, minY - marge);
    maxY += marge;

    const x = i =>
        gauche + (i / (etiquettes.length - 1)) * largeurZone;

    const y = v =>
        hauteur - bas - ((v - minY) / (maxY - minY)) * hauteurZone;

    ctx.clearRect(0, 0, largeur, hauteur);

    // Grille
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "#52677a";
    ctx.strokeStyle = "#e2eaf0";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const valeur = minY + (maxY - minY) * i / 5;
        const py = y(valeur);

        ctx.beginPath();
        ctx.moveTo(gauche, py);
        ctx.lineTo(largeur - droite, py);
        ctx.stroke();

        ctx.fillText(valeur.toFixed(1), gauche - 10, py + 4);
    }

    // Axes
    ctx.strokeStyle = "#52677a";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(gauche, haut);
    ctx.lineTo(gauche, hauteur - bas);
    ctx.lineTo(largeur - droite, hauteur - bas);
    ctx.stroke();

    // Courbe
    ctx.strokeStyle = "#1689b5";
    ctx.lineWidth = 3;
    ctx.beginPath();

    valeurs.forEach((v, i) => {
        if (i === 0) {
            ctx.moveTo(x(i), y(v));
        } else {
            ctx.lineTo(x(i), y(v));
        }
    });

    ctx.stroke();

    // Points et étiquettes
    valeurs.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(x(i), y(v), 4, 0, Math.PI * 2);
        ctx.fillStyle = "#1689b5";
        ctx.fill();

        ctx.textAlign = "center";
        ctx.font = "11px Arial";
        ctx.fillStyle = "#263445";
        ctx.fillText(v.toFixed(1), x(i), y(v) - 10);

        ctx.fillStyle = "#52677a";
        ctx.fillText(etiquettes[i], x(i), hauteur - bas + 20);
    });

    // Titres des axes
    ctx.fillStyle = "#17466b";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        titreX,
        gauche + largeurZone / 2,
        hauteur - 5
    );

    ctx.save();
    ctx.translate(16, haut + hauteurZone / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(titreY, 0, 0);
    ctx.restore();
}
