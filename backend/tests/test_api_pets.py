class TestPetsList:
    """GET /api/v1/pets"""

    def test_list_pets_empty(self, client):
        response = client.get("/api/v1/pets")
        assert response.status_code == 200
        assert response.json() == []


class TestPetDetail:
    """GET /api/v1/pets/{id}"""

    def test_get_nonexistent_pet_returns_404(self, client):
        response = client.get("/api/v1/pets/nonexistent-id")
        assert response.status_code == 404
