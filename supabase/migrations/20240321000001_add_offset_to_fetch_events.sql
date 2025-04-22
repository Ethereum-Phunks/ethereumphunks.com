-- Update fetch_events function to include offset parameter and dual sorting
CREATE OR REPLACE FUNCTION "public"."fetch_events"(
    "p_limit" integer,
    "p_type" "text" DEFAULT NULL::"text",
    "p_collection_slug" "text" DEFAULT 'ethereum-phunks'::"text",
    "p_offset" integer DEFAULT 0
) RETURNS TABLE(
    "hashId" "text",
    "from" "text",
    "to" "text",
    "tokenId" bigint,
    "blockTimestamp" timestamp with time zone,
    "type" "text",
    "value" "text",
    "slug" "text",
    "sha" "text"
)
    LANGUAGE "plpgsql"
    AS $$DECLARE
    "marketAddress" CONSTANT TEXT := '0xd3418772623be1a3cc6b6d45cb46420cedd9154a';  -- market address
    "auctionAddress" CONSTANT TEXT := ''; -- auction address
BEGIN
    RETURN QUERY EXECUTE
    'SELECT
        e."hashId",
        e.from,
        e.to,
        eg."tokenId",
        e."blockTimestamp",
        e.type,
        e.value,
        eg.slug,
        eg.sha
    FROM
        public.events e
    INNER JOIN public.ethscriptions eg ON e."hashId" = eg."hashId"
    WHERE
        eg.slug = ''' || p_collection_slug || '''
        AND e.to != ''' || "auctionAddress" || '''
        AND e.to != ''' || "marketAddress" || '''
        AND e.from != ''' || "auctionAddress" || '''
        AND e.type != ''PhunkNoLongerForSale''' ||
        (CASE WHEN p_type IS NOT NULL THEN
            ' AND e.type = ''' || p_type || ''''
        ELSE
            ''
        END) ||
    ' ORDER BY e."blockTimestamp" DESC, e."txId" ASC
    LIMIT ' || p_limit || '
    OFFSET ' || p_offset;
END;$$;
