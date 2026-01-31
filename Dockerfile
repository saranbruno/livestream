FROM node:25-alpine

RUN apk update && apk add --no-cache \
    nano \
    git

WORKDIR /var/www/html

RUN git config --global --add safe.directory /var/www/html

EXPOSE 2173 9173

CMD ["npm", "run", "dev"]