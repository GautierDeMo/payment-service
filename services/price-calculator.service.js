const API_URL = process.env.BOOK_API_URL || "https://api.example.com/books";

export default async function calculateTotal(ids) {
	if (!Array.isArray(ids) || ids.length === 0) {
		throw new Error("Erreur: ids doit être une liste non vide");
	}

	let total = 0;

	for (const id of ids) {
		try {
			const response = await fetch(`${API_URL}/${id}`); // A modifier en fonction de l'endpoint du groupe catalogue

			if (!response.ok) {
				throw new Error(`Impossible de récupérer le prix pour le livre ${id}`);
			}

			const bookData = await response.json();
			const price = bookData.price; // A modifier en fonction de l'objet retourner par le groupe catalogue

			if (typeof price !== "number" || price < 0) {
				throw new Error(`Prix invalide pour le livre ${id}`);
			}

			total += price;
		} catch (error) {
			console.error(`Erreur pour le livre ${id}:`, error.message);
			throw error;
		}
	}

	return total;
}
