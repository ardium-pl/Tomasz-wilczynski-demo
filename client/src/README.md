# Development notes

## Creating components

Create components in the `components` folder, using the command:

```
ng generate component components/<component-name>
```

## Creating services

Create services in the `services` folder, using the command:

```
ng generate service services/<service-name>/<service-name-again>
```

Note: yes, the service name should be repeated. This is done to create the service in its own folder, rather than in the general `services` folder.

## Creating pages

Create pages for the router in the `pages` folder, using the command:

```
pnpm run ngg-page pages/<page-name>
```

## Creating pipes/guards/interceptors

Create pipes/guards/interceptors in their respective folders using the commands:

```
ng generate pipe pipes/<pipe-name>
ng generate guard guards/<guard-name>
ng generate interceptor interceptors/<interceptor-name>
```

Note: pipes, guards, and interceptors are usually standalone, one-file creations, so we do not need to repeat their name twice. If, however, multiple files were needed for one pipe/guard/interceptor, please create it in its own folder.
