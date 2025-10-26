/******************************************************
 * CONFIGURACIÓN GENERAL
 ******************************************************/
const grid = document.getElementById('bookGrid');
const categoryMenu = document.getElementById('categoryMenu');
const dropdownToggle = document.querySelector('.dropdown-toggle');
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const searchBtn = document.querySelector('.search-btn');
const token = "huzLyFuBMWxzaBXmC6h634YzLl69vge4";
const tableId = 631457;
let allBooks = [];

/******************************************************
 * UTILIDADES
 ******************************************************/
function mezclarArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function normalize(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/******************************************************
 * FUNCIÓN AUXILIAR PARA CAMPOS DE TIPO OBJETO O ARRAY
 ******************************************************/
function extractFieldText(field) {
  if (field == null) return "";
  if (Array.isArray(field)) {
    return field
      .map(item => {
        if (!item && item !== 0) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") return item.value ?? item.name ?? item.text ?? "";
        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof field === "object") {
    return field.value ?? field.name ?? field.text ?? "";
  }
  return String(field);
}

/******************************************************
 * OBTENCIÓN DE LIBROS DESDE BASEROW
 ******************************************************/
async function cargarLibros() {
  let page = 1;
  let resultados = [];
  const urlBase = `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`;

  try {
    while (true) {
      const res = await fetch(`${urlBase}&page=${page}`, {
        headers: { Authorization: `Token ${token}` }
      });
      const data = await res.json();
      resultados = resultados.concat(data.results);
      if (!data.next) break; // si no hay más páginas, detenemos
      page++;
    }

    allBooks = resultados;
    showBooksByPage(allBooks, 1, false);
    generarMenuCategorias(allBooks);
  } catch (err) {
    console.error("Error al cargar libros:", err);
  }
}

cargarLibros();


/******************************************************
 * MOSTRAR LIBROS EN TARJETAS
 ******************************************************/
function showBooks(libros) {
  grid.innerHTML = '';
  libros.forEach(libro => {
    const bookId = libro["N°CAT"] ?? libro.id;
    const portadaUrl = libro["IMG Portada"]?.[0]?.url || 'img/default-cover.png';

    const card = document.createElement("div");
    card.className = "book-card";
    card.innerHTML = `
      <div class="cover"><img src="${portadaUrl}" alt="${libro.Título || 'Sin título'}"></div>
      <div class="title-box"><span class="title">${libro.Título || 'Sin título'}</span></div>
    `;
    card.addEventListener("click", () => mostrarLibro(bookId));
    grid.appendChild(card);
  });
}

/******************************************************
 * PAGINACIÓN
 ******************************************************/
const booksPerPage = 48;
const paginationContainer = document.createElement('div');
paginationContainer.className = 'pagination';
document.querySelector('.main-content').appendChild(paginationContainer);

function showBooksByPage(bookList, page = 1, isFiltered = false) {
  let listaParaMostrar = isFiltered ? [...bookList] : mezclarArray([...bookList]);
  const start = (page - 1) * booksPerPage;
  const end = start + booksPerPage;
  const booksToShow = listaParaMostrar.slice(start, end);
  showBooks(booksToShow);
  renderPagination(bookList, page, isFiltered);
}
function renderPagination(bookList, currentPage, isFiltered = false) {
  const totalBooks = bookList.length;
  const totalPages = Math.ceil(totalBooks / booksPerPage);
  paginationContainer.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'page-btn';
    if (i === currentPage) btn.classList.add('active');
    btn.onclick = () => showBooksByPage(bookList, i, isFiltered);
    paginationContainer.appendChild(btn);
  }
}

/******************************************************
 * MENÚ DE CATEGORÍAS
 ******************************************************/
function generarMenuCategorias(libros) {
  const categoriasSet = new Set();
  libros.forEach(libro => {
    const categoria = libro["Categoría"];
    if (Array.isArray(categoria)) {
      categoria.forEach(cat => {
        const val = typeof cat === 'object' ? (cat?.value || cat?.name) : cat;
        if (val) categoriasSet.add(val);
      });
    } else if (typeof categoria === 'object' && categoria !== null) {
      categoriasSet.add(categoria.value || categoria.name);
    } else if (typeof categoria === 'string') {
      categoriasSet.add(categoria);
    }
  });

  const categoriasUnicas = Array.from(categoriasSet);
  categoriasUnicas.forEach(categoria => {
    const catBtn = document.createElement('button');
    catBtn.textContent = categoria || "Sin categoría";
    catBtn.className = 'category-option';
    catBtn.onclick = () => {
      const filtrados = allBooks.filter(libro => {
        const cat = libro["Categoría"];
        if (!cat) return false;
        if (Array.isArray(cat)) return cat.some(c => (c?.value || c) === categoria);
        if (typeof cat === 'object') return (cat.value || cat.name) === categoria;
        return cat === categoria;
      });
      showBooksByPage(filtrados, 1, true);
      categoryMenu.classList.remove('show');
      dropdownToggle.textContent = `${categoria} ▼`;
    };
    categoryMenu.appendChild(catBtn);
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Mostrar todos';
  resetBtn.className = 'category-option';
  resetBtn.onclick = () => {
    showBooksByPage(allBooks, 1, false);
    categoryMenu.classList.remove('show');
    dropdownToggle.textContent = 'Categorías ▼';
  };
  categoryMenu.appendChild(resetBtn);
}
dropdownToggle.addEventListener('click', () => categoryMenu.classList.toggle('show'));
document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown')) categoryMenu.classList.remove('show');
});

/******************************************************
 * BÚSQUEDA (si tenés la parte de sugerencias previa, mantenela)
 ******************************************************/
function filtrarLibrosPorBusqueda(texto) {
  const textoNormalizado = normalize(texto);
  return allBooks.filter(libro => {
    const titulo = normalize(libro.Título || "");
    const subtitulo = normalize(libro["Subtítulo"] || "");
    const autor = normalize(libro["Autor/es"] || libro.Autor || "");
    const categoria = Array.isArray(libro["Categoría"])
      ? libro["Categoría"].map(cat => normalize(cat?.value || cat)).join(" ")
      : normalize(libro["Categoría"]?.value || libro["Categoría"] || "");
    return titulo.includes(textoNormalizado) ||
           subtitulo.includes(textoNormalizado) ||
           autor.includes(textoNormalizado) ||
           categoria.includes(textoNormalizado);
  });
}

function mostrarSugerencias(texto) {
  suggestionsBox.innerHTML = "";
  if (!texto.trim()) {
    suggestionsBox.style.display = "none";
    return;
  }
  const textoNormalizado = normalize(texto);
  const sugerencias = [];
  allBooks.forEach(libro => {
    const campos = [
      libro.Título, libro["Subtítulo"], libro["Autor/es"], libro.Autor
    ];
    const cats = Array.isArray(libro["Categoría"])
      ? libro["Categoría"].map(c => c?.value || c)
      : [libro["Categoría"]?.value || libro["Categoría"]];
    [...campos, ...cats].forEach(campo => {
      if (campo && normalize(campo).includes(textoNormalizado))
        sugerencias.push(campo);
    });
  });
  const unicas = [...new Set(sugerencias)].slice(0, 6);
  if (!unicas.length) {
    suggestionsBox.style.display = "none";
    return;
  }
  unicas.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item;
    div.className = 'suggestion-item';
    div.onclick = () => {
      searchInput.value = item;
      suggestionsBox.style.display = "none";
      const resultados = filtrarLibrosPorBusqueda(item);
      showBooksByPage(resultados, 1, true);
    };
    suggestionsBox.appendChild(div);
  });
  suggestionsBox.style.display = "block";
}

if (searchInput) {
  searchInput.addEventListener('input', () => mostrarSugerencias(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const resultados = filtrarLibrosPorBusqueda(searchInput.value);
      showBooksByPage(resultados, 1, true);
      suggestionsBox.style.display = "none";
    }
  });
}
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const resultados = filtrarLibrosPorBusqueda(searchInput.value);
    showBooksByPage(resultados, 1, true);
    suggestionsBox.style.display = "none";
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.search-container')) suggestionsBox.style.display = 'none';
});

/******************************************************
 * MOSTRAR DETALLE DEL LIBRO EN MODAL
 ******************************************************/
function mostrarLibro(idLibro) {
  const libro = allBooks.find(row => row["N°CAT"] == idLibro);
  if (!libro) return alert("No se encontró el libro.");

  document.getElementById("titulo").textContent = libro["Título"] || "Sin título";

  const subtituloEl = document.getElementById("subtitulo");
  if (libro["Subtítulo"]) {
    subtituloEl.textContent = libro["Subtítulo"];
    subtituloEl.style.display = "block";
  } else subtituloEl.style.display = "none";

  document.getElementById("autor").textContent = libro["Autor/es"] || "Desconocido";
  document.getElementById("editorial").textContent = libro["Editorial"] || "Sin editorial";
  document.getElementById("categoria").textContent = (libro["Categoría"] && (Array.isArray(libro["Categoría"]) ? libro["Categoría"].map(c => c?.value || c).join(", ") : (libro["Categoría"].value || libro["Categoría"] || "Sin categoría"))) || "Sin categoría";

  // 🟢 Estado y ubicación (usando helper)
  const estadoTexto = extractFieldText(libro["Estado"] || libro.Estado);
  document.getElementById("estado").textContent = estadoTexto || "No especificado";
  document.getElementById("ubicacion").textContent = `Ubicación: ${extractFieldText(libro["Ubicación"] || libro.Ubicación) || "No especificada"}`;

  // 🟢 Sinopsis
  const sinopsisContainer = document.getElementById("sinopsis-container");
  const sinopsisEl = document.getElementById("sinopsis");
  if (libro["Sinopsis"] && String(libro["Sinopsis"]).trim() !== "") {
    sinopsisEl.textContent = libro["Sinopsis"];
    sinopsisContainer.style.display = "block";
  } else {
    sinopsisContainer.style.display = "none";
  }

  // 🟢 Portada
  if (libro["IMG Portada"]?.[0]?.url) {
    document.getElementById("cover-img").src = libro["IMG Portada"][0].url;
  } else {
    document.getElementById("cover-img").src = "img/portada_default.png";
  }

  document.getElementById("bookModal").style.display = "flex";
}

/******************************************************
 * CERRAR MODAL - ENLACE DIRECTO (sin DOMContentLoaded)
 ******************************************************/
const modal = document.getElementById("bookModal");
const closeBtn = document.querySelector(".close-modal");

// Cerrar al hacer clic en la X
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
  });
}

// Cerrar al hacer clic fuera del contenido (overlay)
if (modal) {
  modal.addEventListener("click", (e) => {
    // si el target es exactamente el overlay, cerramos
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Cerrar con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal && modal.style.display === "flex") modal.style.display = "none";
  }
});
