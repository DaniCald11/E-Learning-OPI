namespace EduLearning.Application.Catalog;

public static class CatalogRules
{
    public static void ValidateCourse(
        CourseDraft draft,
        bool publishing = false,
        bool workshop = false
    )
    {
        if (
            draft.Topics is null
            || draft.Topics.Length > 100
            || draft.Topics.Any(t =>
                t is null
                || t.Modules is null
                || t.Modules.Any(m =>
                    m is null
                    || m.Lessons is null
                    || m.Lessons.Any(l => l is null || l.MediaIds is null)
                )
            )
        )
            throw new CatalogException("La estructura del curso no es válida.");
        var topics = draft.Topics;
        var modules = topics.SelectMany(x => x.Modules).ToArray();
        var lessons = modules.SelectMany(x => x.Lessons).ToArray();
        var ids = topics
            .Select(x => x.Id)
            .Concat(modules.Select(x => x.Id))
            .Concat(lessons.Select(x => x.Id))
            .ToArray();
        if (
            ids.Any(x => x == Guid.Empty)
            || ids.Distinct().Count() != ids.Length
            || modules.Length > 500
            || lessons.Length > 2000
        )
            throw new CatalogException(
                "Los identificadores de contenido deben ser únicos y la estructura acotada."
            );
        if (
            topics.Any(x => string.IsNullOrWhiteSpace(x.Title) || x.Title.Length > 200)
            || modules.Any(x => string.IsNullOrWhiteSpace(x.Title) || x.Title.Length > 200)
            || lessons.Any(x =>
                string.IsNullOrWhiteSpace(x.Title)
                || x.Title.Length > 200
                || x.Type is not ("Video" or "Document" or "Mixed")
                || x.MediaIds is null
            )
        )
            throw new CatalogException("Revisa títulos, tipos de lección y materiales.");
        if (
            publishing
            && (
                topics.Length == 0
                || topics.Any(x => x.Modules.Length == 0)
                || modules.Any(x => x.Lessons.Length == 0)
                || !lessons.Any(x => x.IsRequired)
                || lessons.Any(x => x.MediaIds.Length == 0)
            )
        )
            throw new CatalogException(
                "Publicar requiere temas, módulos, lecciones, materiales y al menos una lección obligatoria."
            );
        if (workshop && draft.Quiz is null)
            throw new CatalogException(
                "Falta el cuestionario del curso. Créalo y publica una nueva versión del curso."
            );
        if (draft.Quiz is { } quiz)
        {
            if (
                quiz.Id == Guid.Empty
                || string.IsNullOrWhiteSpace(quiz.Title)
                || quiz.Title.Length > 200
                || quiz.Questions is null
                || quiz.Questions.Length > 100
                || ((publishing || workshop) && quiz.Questions.Length == 0)
            )
                throw new CatalogException("El cuestionario requiere título y preguntas válidas.");
            if (
                quiz.Questions.Any(q =>
                    q is null
                    || q.Id == Guid.Empty
                    || string.IsNullOrWhiteSpace(q.Prompt)
                    || q.Prompt.Length > 2000
                    || q.Points <= 0
                    || q.Points > 1000
                    || q.Options is null
                    || q.Options.Length < 2
                    || q.Options.Length > 10
                    || q.Options.Any(o =>
                        o is null
                        || o.Id == Guid.Empty
                        || string.IsNullOrWhiteSpace(o.Text)
                        || o.Text.Length > 1000
                    )
                    || q.Options.Count(o => o.IsCorrect) != 1
                )
            )
                throw new CatalogException(
                    "Cada pregunta necesita puntaje positivo, dos o más opciones y exactamente una respuesta correcta."
                );
            var quizIds = quiz
                .Questions.Select(x => x.Id)
                .Concat(quiz.Questions.SelectMany(x => x.Options).Select(x => x.Id))
                .Append(quiz.Id)
                .Concat(ids)
                .ToArray();
            if (quizIds.Distinct().Count() != quizIds.Length)
                throw new CatalogException("Hay identificadores duplicados en el cuestionario.");
        }
    }

    public static void ValidateProduct(ProductDraft draft)
    {
        if (
            !Enum.IsDefined(draft.Type)
            || draft.Currency != "MXN"
            || draft.Price <= 0
            || decimal.Round(draft.Price, 2) != draft.Price
        )
            throw new CatalogException(
                "Revisa el tipo de producto y el precio en MXN (máximo dos decimales)."
            );
        if (
            draft.Courses is null
            || draft.Courses.Length > 100
            || draft.Courses.Any(x => x is null || x.CourseId == Guid.Empty || x.Position < 1)
            || draft.Courses.Select(x => x.CourseId).Distinct().Count() != draft.Courses.Length
            || draft.Courses.Select(x => x.Position).Distinct().Count() != draft.Courses.Length
        )
            throw new CatalogException("Selecciona cursos únicos con posiciones únicas.");
        if (
            draft.Type == EduLearning.Domain.Catalog.ProductType.Workshop
            && draft.Courses.Any(x => !x.IsRequired)
        )
            throw new CatalogException(
                "Todos los cursos del taller deben ser obligatorios en el MVP."
            );
        if (
            draft.Type == EduLearning.Domain.Catalog.ProductType.IndividualCourse
            && draft.Courses.Length > 1
        )
            throw new CatalogException("Un producto individual admite exactamente un curso.");
    }
}
