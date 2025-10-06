// src/hooks/useHomeContent.js
import { useEffect, useState } from "react";
import { supabase } from "../../src/supabaseClient";

/**
 * Fetches 1 or many rows from home_content.
 * - If singleRow=true -> returns the single row for a section/sort_order.
 * - Else -> returns all rows for that section (ordered by sort_order).
 */
export function useHomeContent({ section, sort = null, singleRow = false }) {
  const [data, setData]   = useState(singleRow ? null : []);
  const [loading, setL]   = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let canceled = false;

    (async () => {
      setL(true);
      setError(null);

      let q = supabase
        .from("home_content")
        .select("section_key, sort_order, title, subtitle, description, media_url, cta_label, cta_href, is_active");

      q = q.eq("section_key", section);

      if (singleRow) {
        q = sort !== null ? q.eq("sort_order", sort) : q.order("sort_order", { ascending: true }).limit(1);
        const { data: row, error } = await q.single();
        if (!canceled) {
          if (error) setError(error);
          else setData(row);
          setL(false);
        }
      } else {
        if (sort !== null) q = q.eq("sort_order", sort);
        const { data: rows, error } = await q.order("sort_order", { ascending: true });
        if (!canceled) {
          if (error) setError(error);
          else setData(rows || []);
          setL(false);
        }
      }
    })();

    return () => { canceled = true; };
  }, [section, sort, singleRow]);

  return { data, loading, error };
}
