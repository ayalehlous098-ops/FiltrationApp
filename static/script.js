
const form = document.getElementById("filtrationForm");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

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
        const response = await fetch("/api/simulation", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(d)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Erreur de calcul");
        }

        // Résultats des cinq opérations
        document.getElementById("resultats").innerHTML = `
            <h2>Résultats de simulation</h2>

            <h3>1. Filtration</h3>
            <p>Débit après filtration : <strong>${data.m1} kg/h</strong></p>
            <p>Concentration après filtration : <strong>${data.x1} %</strong></p>

            <h3>2. Mélange</h3>
            <p>Débit après mélange : <strong>${data.m2} kg/h</strong></p>
            <p>Concentration après mélange : <strong>${data.x2} %</strong></p>

            <h3>3. Chauffage</h3>
            <p>Puissance thermique : <strong>${data.Q3} kW</strong></p>

            <h3>4. Évaporation</h3>
            <p>Débit de concentré : <strong>${data.m4} kg/h</strong></p>
            <p>Débit d'eau évaporée : <strong>${data.mv} kg/h</strong></p>
            <p>Puissance d'évaporation : <strong>${data.Q4} kW</strong></p>

            <h3>5. Refroidissement</h3>
            <p>Puissance de refroidissement : <strong>${data.Q5} kW</strong></p>
        `;

        // Vérification du bilan massique global
        const entrees = d.m0 + d.mR;
        const sorties = d.residus + data.mv + data.m4;
        const ecartM = Math.abs(entrees - sorties);

        document.getElementById("entreesTotales").textContent =
            entrees.toFixed(2) + " kg/h";

        document.getElementById("sortiesTotales").textContent =
            sorties.toFixed(2) + " kg/h";

        document.getElementById("ecartMassique").textContent =
            ecartM.toFixed(4) + " kg/h";

        document.getElementById("statutMassique").textContent =
            ecartM < 0.01 ? "✓ Bilan massique équilibré" :
            "✗ Bilan massique non équilibré";

        document.getElementById("statutMassique").className =
            ecartM < 0.01 ? "bilan-ok" : "bilan-error";

        // Vérification du bilan de matière soluble
        const solubleEntree =
            d.m0 * d.x0 / 100 + d.mR * d.xR / 100;

        const solubleSortie =
            data.m4 * d.x4 / 100;

        const ecartS = Math.abs(solubleEntree - solubleSortie);

        document.getElementById("solubleEntrante").textContent =
            solubleEntree.toFixed(2) + " kg/h";

        document.getElementById("solubleSortante").textContent =
            solubleSortie.toFixed(2) + " kg/h";

        document.getElementById("ecartSoluble").textContent =
            ecartS.toFixed(4) + " kg/h";

        document.getElementById("statutSoluble").textContent =
            ecartS < 0.01 ? "✓ Bilan de matière soluble équilibré" :
            "✗ Bilan de matière soluble non équilibré";

        document.getElementById("statutSoluble").className =
            ecartS < 0.01 ? "bilan-ok" : "bilan-error";

        // Graphique 1 : évaporation
        const concentrations = [];
        const debitsEvapores = [];

        for (let c = 40; c <= 50; c++) {
            const debitConcentre = (data.m2 * data.x2) / c;
            const debitEvapore = data.m2 - debitConcentre;

            concentrations.push(c + "%");
            debitsEvapores.push(Number(debitEvapore.toFixed(2)));
        }

        dessinerGraphique(
            "graphiqueEvaporation",
            concentrations,
            debitsEvapores,
            "Concentration finale (%)",
            "Débit d'eau évaporée (kg/h)"
        );

        // Graphique 2 : chauffage
        const temperatures = [];
        const puissances = [];

        for (let T = 60; T <= 100; T += 5) {
            const Q = (data.m2 * d.Cp * (T - d.T2)) / 3600;

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

    } catch (error) {
        alert(error.message);
    }
});


// Fonction générale de dessin des graphiques
function dessinerGraphique(id, etiquettes, valeurs, titreX, titreY) {

    const canvas = document.getElementById(id);
    const ctx = canvas.getContext("2d");

    const largeur = canvas.clientWidth;
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

    const x = i => gauche + (i / (etiquettes.length - 1)) * largeurZone;
    const y = v => hauteur - bas - ((v - minY) / (maxY - minY)) * hauteurZone;

    ctx.clearRect(0, 0, largeur, hauteur);

    // Grille
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "#52677a";
    ctx.strokeStyle = "#e2eaf0";

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
        if (i === 0) ctx.moveTo(x(i), y(v));
        else ctx.lineTo(x(i), y(v));
    });

    ctx.stroke();

    // Points
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

    // Titres
    ctx.fillStyle = "#17466b";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(titreX, gauche + largeurZone / 2, hauteur - 5);

    ctx.save();
    ctx.translate(16, haut + hauteurZone / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(titreY, 0, 0);
    ctx.restore();
}
