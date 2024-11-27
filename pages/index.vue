<script setup lang="ts">
import { useAuth } from 'vue-clerk'

const { isSignedIn } = useAuth()
</script>

<template>
  <div class="bg-white">
    <!-- Hero section -->
    <div class="relative isolate overflow-hidden">
      <div class="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div class="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <h1 class="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Create stunning AI videos
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Transform your images into captivating videos with our AI-powered video generation platform.
          </p>
          <div class="mt-10 flex items-center gap-x-6">
            <NuxtLink
              v-if="isSignedIn"
              to="/video-generator"
              class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create Video
            </NuxtLink>
            <NuxtLink
              v-else
              to="/signup"
              class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get Started
            </NuxtLink>
            <NuxtLink
              v-if="!isSignedIn"
              to="/login"
              class="text-sm font-semibold leading-6 text-gray-900"
            >
              Sign In <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </div>
        <div class="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div class="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <img
              src="https://tailwindui.com/img/component-images/dark-project-app-screenshot.png"
              alt="App screenshot"
              width="2432"
              height="1442"
              class="w-[76rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Feature section -->
    <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-base font-semibold leading-7 text-indigo-600">Create Faster</h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything you need to create amazing videos</p>
        <p class="mt-6 text-lg leading-8 text-gray-600">
          Our AI-powered platform makes it easy to transform your images into professional-quality videos in minutes.
        </p>
      </div>

      <!-- Feature list -->
      <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          <div class="flex flex-col">
            <dt class="text-base font-semibold leading-7 text-gray-900">
              AI-Powered Generation
            </dt>
            <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
              <p class="flex-auto">Advanced AI algorithms transform your static images into dynamic, engaging videos.</p>
            </dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-base font-semibold leading-7 text-gray-900">
              Quick & Easy
            </dt>
            <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
              <p class="flex-auto">Generate professional videos in minutes with our user-friendly interface.</p>
            </dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-base font-semibold leading-7 text-gray-900">
              High Quality Results
            </dt>
            <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
              <p class="flex-auto">Get stunning, high-quality videos that capture attention and engage your audience.</p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
