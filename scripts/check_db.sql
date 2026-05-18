SELECT p."FullName", fe."Id" as embedding_id, 
       substring(fe."Vector"::text, 1, 100) as vector_preview, 
       fe."QualityScore" 
FROM face_embeddings fe 
JOIN persons p ON p."Id" = fe."PersonId" 
WHERE p."FullName" IN ('Alice Johnson', 'Bob Smith') 
ORDER BY p."FullName", fe."CreatedAt";
