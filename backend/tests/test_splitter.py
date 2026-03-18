from app.services.splitter import split_visits


# Real text snippets from analyzed documents
MARLEY_TEXT = """PARQUE OESTE
AVDA EUROPA
28922 ALCORCÓN
Linea 4
Datos de la Mascota
MARLEY
Canino
Labrador Retriever
HISTORIAL COMPLETO DE MARLEY DESDE LA PRIMERA VISITA A NUESTRO CENTRO
- 08/12/19 - 16:12 -
Vienen de urgencias porque tiene una costrita en la epd.
4.1kg
Era el más pequeño de la camada.
- 10/12/19 - 10:25 -
Exploracion todo ok
4.6kg
Las heces que ha hecho son normales.
- 13/12/19 - 10:20 -
38ºC
Exploracion todo ok.
Milpro desparasitacion interna.
"""

ALYA_TEXT = """HV COSTA AZAHAR
MASCOTA
ALYA - Nacimiento: 05/07/2018
CANINA - YORKSHIRE TERRIER
VISITA VACUNACION/DESPARASITACION DEL DÍA 17/07/2024 19:23:12 EN EL CENTRO COSTA AZAHAR
ACUDE PARA PONER LA VACUNA TETRAVALENTE
VISITA CONSULTA GENERAL DEL DÍA 17/06/2024 EN EL CENTRO COSTA AZAHAR
DAMOS EL TRATAMIENTO PARA LA GIARDIASIS
"""


class TestVisitSplitter:
    def test_splits_marley_by_date(self):
        result = split_visits(MARLEY_TEXT)
        assert len(result.header_text) > 0
        assert "PARQUE OESTE" in result.header_text
        assert "MARLEY" in result.header_text
        assert len(result.visit_chunks) == 3
        assert result.visit_chunks[0]["date_raw"] == "08/12/19"
        assert result.visit_chunks[1]["date_raw"] == "10/12/19"
        assert result.visit_chunks[2]["date_raw"] == "13/12/19"

    def test_splits_alya_by_date(self):
        result = split_visits(ALYA_TEXT)
        assert len(result.header_text) > 0
        assert "ALYA" in result.header_text
        assert len(result.visit_chunks) == 2

    def test_handles_document_with_no_dates(self):
        result = split_visits("Just some text with no dates at all.")
        assert len(result.visit_chunks) == 1
        assert result.visit_chunks[0]["date_raw"] == "unknown"

    def test_handles_single_visit_document(self):
        text = "- 15/01/26 -\nSingle visit notes here."
        result = split_visits(text)
        assert len(result.visit_chunks) == 1

    def test_preserves_text_between_dates(self):
        text = """- 01/01/20 -
First visit content here.
More content.
- 02/01/20 -
Second visit content."""
        result = split_visits(text)
        assert len(result.visit_chunks) == 2
        assert "First visit content" in result.visit_chunks[0]["text"]
        assert "Second visit content" in result.visit_chunks[1]["text"]

    def test_header_is_empty_when_text_starts_with_date(self):
        text = "- 01/01/20 -\nVisit notes."
        result = split_visits(text)
        assert result.header_text == ""
        assert len(result.visit_chunks) == 1

    def test_handles_different_date_formats(self):
        text = """- 08/12/19 - 16:12 -
Spanish style
VISITA CONSULTA GENERAL DEL DÍA 17/07/2024 EN EL CENTRO
Formal style"""
        result = split_visits(text)
        assert len(result.visit_chunks) == 2
