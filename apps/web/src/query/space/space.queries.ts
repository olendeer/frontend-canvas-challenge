'use client';

import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { SpaceEntity } from 'domain/space';
import { useSpacesRepo } from 'providers/services.hooks';

import { queryKeys } from '../query-keys';

export const useSpacesQuery = (): UseQueryResult<SpaceEntity[]> => {
  const spaces = useSpacesRepo();

  return useQuery({
    queryFn: ({ signal }) => spaces.getSpaces({ signal }),
    queryKey: queryKeys.spaces(),
  });
};

export const useSpaceQuery = (spaceId: string): UseQueryResult<SpaceEntity> => {
  const spaces = useSpacesRepo();

  return useQuery({
    queryFn: ({ signal }) => spaces.getSpace(spaceId, { signal }),
    queryKey: queryKeys.space(spaceId),
    staleTime: Infinity,
  });
};

export const useCreateSpaceMutation = (): UseMutationResult<SpaceEntity, Error, string> => {
  const spaces = useSpacesRepo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => spaces.createSpace({ title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces() }),
  });
};
