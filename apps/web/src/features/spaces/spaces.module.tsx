'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { ErrorAlert } from 'features/error-alert';
import { useCreateSpaceMutation, useSpacesQuery } from 'query';
import { Button, Card, EmptyState, LinkButton, LoadingCard, TextInput } from 'ui-kit';

import styles from './spaces.module.scss';

const MAX_TITLE_LENGTH = 80;

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

export const SpacesModule = () => {
  const router = useRouter();
  const spaces = useSpacesQuery();
  const create = useCreateSpaceMutation();
  const [title, setTitle] = useState('');

  const onSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();

    const value = title.trim();

    if (!value) {
      return;
    }

    create.mutate(value, { onSuccess: (space) => router.push(`/spaces/${space.id}`) });
  };

  return (
    <section className={styles.page}>
      <header>
        <h1 className={styles.heading}>Рабочие пространства</h1>
        <p className={styles.caption}>
          Создайте пространство и соберите в нём цепочку «текст → генератор → результат».
        </p>
      </header>

      <Card as="form" className={styles.form} onSubmit={onSubmit}>
        <TextInput
          hint={`До ${MAX_TITLE_LENGTH} символов`}
          label="Название пространства"
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Мой канвас"
          value={title}
        />
        <Button disabled={!title.trim()} isLoading={create.isPending} type="submit">
          Создать и открыть
        </Button>
      </Card>

      {create.isError ? <ErrorAlert error={create.error} title="Пространство не создано" /> : null}

      {spaces.isPending ? <LoadingCard label="Загружаем список" /> : null}

      {spaces.isError ? (
        <ErrorAlert
          error={spaces.error}
          onAction={() => spaces.refetch()}
          title="Список не загрузился"
        />
      ) : null}

      {spaces.data?.length === 0 ? (
        <EmptyState
          description="Создайте первое пространство — оно откроется сразу после создания."
          title="Пространств пока нет"
        />
      ) : null}

      {spaces.data?.length ? (
        <ul className={styles.list}>
          {spaces.data.map((space) => (
            <Card as="li" className={styles.item} key={space.id}>
              <div>
                <p className={styles.title}>{space.title}</p>
                <time
                  className={styles.caption}
                  dateTime={space.createdAt}
                  suppressHydrationWarning
                >
                  {dateFormat.format(new Date(space.createdAt))}
                </time>
              </div>
              <LinkButton href={`/spaces/${space.id}`} size="sm" variant="secondary">
                Открыть канвас
              </LinkButton>
            </Card>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
