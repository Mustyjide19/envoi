import { UserButton } from '@clerk/nextjs'
import React from 'react'

function Files() {
  return (
    <div className="flex flex-col gap-2">
      <span>Files</span>
      <UserButton />
    </div>
  )
}

export default Files
