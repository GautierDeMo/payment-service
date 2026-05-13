const CATALOGUE = {
    1: { title: "Clean Code", price: 29.99 },
    2: { title: "The Pragmatic Programmer", price: 34.99 },
    3: { title: "Design Patterns", price: 44.99 },
    4: { title: "Refactoring", price: 39.99 },
    5: { title: "You Don't Know JS", price: 19.99 },
};

function fetchBooksByIds(bookIds) {
    const books = [];
    for (const id of bookIds) {
        const book = CATALOGUE[id];
        if (!book) {
            const err = new Error(`Book with ID ${id} not found in catalogue`);
            err.statusCode = 404;
            throw err;
        }
        books.push({
            bookId: id,
            title: book.title,
            price: book.price,
            quantity: 1,
        });
    }
    return books;
}

function calculateTotal(books) {
    return books.reduce((sum, b) => sum + b.price * b.quantity, 0);
}

function simulateRollback(books) {
    console.log(
        "[CatalogueRollback] Restocking books:",
        books.map((b) => `${b.title} (+${b.quantity})`).join(", "),
    );
}

export default { fetchBooksByIds, calculateTotal, simulateRollback };
