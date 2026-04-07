import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';

const resolveSeatMapRoute = (rawCategory: string | null): string => {
  const category = (rawCategory || '').toLowerCase().trim();

  if (
    category === 'sports' ||
    category === 'sport' ||
    category === 'match' ||
    category === 'cricket' ||
    category === 'stadium'
  ) {
    return '/eventra/seats/stadium-enhanced';
  }

  if (
    category === 'movie' ||
    category === 'movies' ||
    category === 'cinema' ||
    category === 'theater' ||
    category === 'theatre' ||
    category === 'film'
  ) {
    return '/eventra/seats/cinema-enhanced';
  }

  if (
    category === 'concert' ||
    category === 'music' ||
    category === 'ground' ||
    category === 'comedy' ||
    category === 'expo' ||
    category === 'dining'
  ) {
    return '/eventra/seats/concert-enhanced';
  }

  return '/eventra/seats/stadium-enhanced';
};

const EventSeatMapRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category') || searchParams.get('type');
  const [resolvedCategory, setResolvedCategory] = useState<string | null>(queryCategory);

  useEffect(() => {
    let isMounted = true;

    if (queryCategory) {
      setResolvedCategory(queryCategory);
      return () => {
        isMounted = false;
      };
    }

    const parsedId = Number(id);
    if (!id || Number.isNaN(parsedId) || parsedId <= 0) {
      setResolvedCategory(null);
      return () => {
        isMounted = false;
      };
    }

    eventAPI
      .retrieve(parsedId)
      .then((eventData) => {
        if (!isMounted) {
          return;
        }
        setResolvedCategory(eventData.category || null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setResolvedCategory(null);
      });

    return () => {
      isMounted = false;
    };
  }, [id, queryCategory]);

  const targetRoute = resolveSeatMapRoute(resolvedCategory);

  const query = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get('category') && resolvedCategory) {
      params.set('category', resolvedCategory);
    }
    return params.toString();
  }, [resolvedCategory, searchParams]);

  return <Navigate replace to={query ? `${targetRoute}?${query}` : targetRoute} />;
};

export default EventSeatMapRouter;
